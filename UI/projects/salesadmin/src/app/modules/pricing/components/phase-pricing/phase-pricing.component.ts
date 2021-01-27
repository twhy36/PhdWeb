import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, of, timer } from 'rxjs';
import { switchMap, filter, combineLatest, map, tap, finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';
import { OrganizationService } from '../../../core/services/organization.service';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { PricingService } from '../../../core/services/pricing.service';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ISalesPhase } from '../../../shared/models/pricing.model';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent, PhdTableComponent } from 'phd-common';
import { PhasePricingSidePanelComponent } from '../phase-pricing-side-panel/phase-pricing-side-panel.component';

@Component({
	selector: 'phase-pricing',
	templateUrl: './phase-pricing.component.html',
	styleUrls: ['./phase-pricing.component.scss']
})
export class PhasePricingComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(PhasePricingSidePanelComponent)
	private sidePanel: PhasePricingSidePanelComponent;

	@ViewChild("phaseEnableCheckBox") _phaseEnableCheckBox: ElementRef;

	activeCommunities: Observable<Array<FinancialCommunityViewModel>>;
	selectedCommunity: FinancialCommunityViewModel = null;

	phases: ISalesPhase[];
	activePhase: ISalesPhase;
	showGrid = false;
	isPhaseEnable: boolean;
	sidePanelOpen: boolean = false;
	canEdit: boolean = false;
	pagedPhases: Array<ISalesPhase>;
	currentPage = 1;
	phasesPerPage = 10;
	saving: boolean = false;

	constructor(
		private _orgService: OrganizationService,
		private _route: ActivatedRoute,
		private _msgService: MessageService,
		private _pricingService: PricingService,
		private _modalService: NgbModal) { super(); }

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !this.sidePanel.phasePriceForm.dirty : true
	}

	ngOnInit(): void
	{
		this.activeCommunities = this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			tap(mkt =>
			{
				this.onSidePanelClose(false);
			}),
			switchMap(mkt =>
			{
				if (mkt)
				{
					return this._orgService.getFinancialCommunities(mkt.id);
				}
				else
				{
					return of([]);
				}
			}),
			map(comms => comms.map(comm => new FinancialCommunityViewModel(comm)).filter(c => c.isActive))
		);

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			tap(comm =>
			{
				this.selectedCommunity = new FinancialCommunityViewModel(comm) || null;
				this.isPhaseEnable = comm ? comm.isPhasedPricingEnabled : false;
				this.phases = null;
			}),
			filter(comm => comm != null),
			switchMap(comm => this._pricingService.getCommunityPlans(comm.id).pipe(
				combineLatest(this._pricingService.getCommunitySalesPhases(comm.id)),
				map(([plans, phases]) => [<ISalesPhase>{ phasePlans: plans, salesPhaseName: "List Prices" }, ...phases])
			))
		).subscribe(phases =>
		{
			this.phases = phases;
			this.showGrid = true;
			this.changePage();
		});

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	onChangeCommunity(comm: FinancialCommunity): void
	{
		this.showGrid = false;

		if (comm != null)
		{
			this._orgService.selectCommunity(comm);
		}
	}

	showPrompt(newValue: boolean)
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let msgBody = this.isPhaseEnable ? 'This will disable Phase Pricing for the community.All lots will be subject to List Pricing.' : `List Price updates will be disabled for any lot assigned in a phase.<br><br> `;

		let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{

				this.enablePhasePricing(newValue);
			}
			else
			{
				this._phaseEnableCheckBox.nativeElement.checked = newValue ? null : 'checked';
			}
		}, (reason) =>
			{

			});
	}

	enablePhasePricing(newValue: boolean)
	{
		this._pricingService.enablePhasePricing(this.selectedCommunity.id, newValue)
			.subscribe(newDto =>
			{

				this.isPhaseEnable = newValue;
				this.selectedCommunity.dto.isPhasedPricingEnabled = newValue;

				this._msgService.add({ severity: 'success', summary: 'Community', detail: `has been updated!` });
			},
				error =>
				{
					this._phaseEnableCheckBox.nativeElement.checked = newValue ? null : 'checked';

					this._msgService.add({ severity: 'error', summary: 'Error', detail: error });

					console.log(error);
				});
	}

	saveSalePhase(phase: any)
	{
		this.saving = true;

		let commId = this.selectedCommunity.id;
		let oldPhase = this.phases.find(p => p.id === phase.newSalesPhase.id);

		this._pricingService.saveSalesPhase(phase.newSalesPhase, phase.oldSalesPhaseLotAssoc, commId)
			.pipe(
				finalize(() => { this.saving = false; }),
				tap(dto =>
				{
					this.showGrid = false;
					this.phases = this.activePhase ? this.replacePhase(oldPhase, dto) : [...this.phases, dto];
					this.changePage();
					this._msgService.add({ severity: 'success', summary: 'Sales Phase', detail: `has been created!` });
				}),
				switchMap(() => timer(100))
			).subscribe((dto) =>
			{
				this.showGrid = true;
				this.sidePanelOpen = false;
			},
			error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Error', detail: error });
			});
	}

	replacePhase(oldPhase: ISalesPhase, newPhase: ISalesPhase)
	{
		let phases = [...this.phases];

		phases.splice(this.phases.indexOf(oldPhase), 1, newPhase);

		return phases;
	}

	managePhase(phase?: ISalesPhase)
	{
		this.activePhase = phase || null;
		this.sidePanelOpen = true;
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
	}

	getRowClass(rowData: any): string
	{
		return rowData['_isActive'] ? null : 'inactive-plan';
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}

	previousPage()
	{
		if (this.currentPage > 1)
		{
			this.currentPage--;
			this.changePage();
		}
	}

	nextPage()
	{
		if (this.currentPage < this.numberPages())
		{
			this.currentPage++;
			this.changePage();
		}
	}

	changePage()
	{
		this.showGrid = false;
		this.pagedPhases = [];

		const pageStart = (this.currentPage - 1) * this.phasesPerPage;

		if (this.currentPage !== 1)
		{
			this.pagedPhases.push(this.phases[0]);
		}

		this.pagedPhases = this.pagedPhases.concat(this.phases.slice(pageStart, pageStart + this.phasesPerPage));

		setTimeout(() => this.showGrid = true, 0);

	}

	numberPages()
	{
		return this.phases && this.phases.length > 0 ? Math.ceil(this.phases.length / this.phasesPerPage) : 0;
	}
}

