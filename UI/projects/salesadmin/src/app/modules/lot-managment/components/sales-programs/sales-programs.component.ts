import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { tap, switchMap, finalize, combineLatest } from 'rxjs/operators';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { FinancialCommunity, FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';
import { SalesProgram } from '../../../shared/models/salesPrograms.model';
import { SalesService } from '../../../core/services/sales.service';
import { MessageService } from 'primeng/api';
import { OrganizationService } from '../../../core/services/organization.service';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent, Constants, PhdTableComponent, SpecDiscountService } from 'phd-common';
import { SalesProgramsSidePanelComponent } from '../sales-programs-side-panel/sales-programs-side-panel.component';

import * as moment from 'moment';
import { Org } from '../../../shared/models/org.model';

@Component({
	selector: 'sales-programs',
	templateUrl: './sales-programs.component.html',
	styleUrls: ['./sales-programs.component.scss']
})

export class SalesProgramsComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SalesProgramsSidePanelComponent)
	private sidePanel: SalesProgramsSidePanelComponent;

	private _selectedSalesProgram: SalesProgram;

	saving: boolean = false;
	sidePanelOpen: boolean = false;
	activeCommunities: Array<FinancialCommunityViewModel>;
	selectedCommunity: FinancialCommunityViewModel = null;
	canEdit: boolean = false;
	salesPrograms: Array<SalesProgram>;
	_loading: boolean = true;
	financialCommunityInfo: FinancialCommunityInfo; // DELETEME when THO columns are migrated to EDH
	internalOrgs: Array<Org>;
	orgId: number;

	constructor(
		private _salesService: SalesService,
		private _orgService: OrganizationService,
		private _modalService: NgbModal,
		private _msgService: MessageService,
		private _specDiscountService: SpecDiscountService,
		private _route: ActivatedRoute
	)
	{
		super();
	}

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !this.sidePanel.releaseForm.dirty : true
	}

	ngOnInit()
	{
		this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			tap(mkt =>
			{
				this.loading = true;
			}),
			switchMap(mkt =>
			{
				if (mkt)
				{
					return this._orgService.getFinancialCommunities(mkt.id).pipe(
						combineLatest(this._orgService.getInternalOrgs(mkt.id),
							this._orgService.currentCommunity$)
					);
				}
			})
		).subscribe(([comms, orgs, comm]) =>
		{
			this.activeCommunities = comms.map(comm => new FinancialCommunityViewModel(comm)).filter(c => c.isActive);

			if (comm != null)
			{
				this.orgId = orgs?.find(o => o.edhFinancialCommunityId === comm.id)?.orgID;

				if (!this.selectedCommunity || this.selectedCommunity.id != comm.id)
				{
					this.selectedCommunity = new FinancialCommunityViewModel(comm);

					this._salesService.getSalesPrograms(comm.id)
						.pipe(
							combineLatest(this._orgService.getFinancialCommunityInfo(this.orgId))
						)
						.subscribe(([programs, fcInfo]) =>
						{
							this.salesPrograms = programs;

							// DELETEME when THO columns are migrated to EDH
							this.financialCommunityInfo = fcInfo;

							if (this.financialCommunityInfo)
							{
								this.salesPrograms.map(sp =>
								{
									sp.isWebSaleable = this.financialCommunityInfo.thoBuyerClosingCostId === sp.id || this.financialCommunityInfo.thoDiscountFlatAmountId === sp.id;
								});
							}
							//end DELETEME

							this.loading = false;
						});
				}
			}
			else
			{
				this.selectedCommunity = null;
			}
		});

		this._orgService.canEdit(this._route.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	get loading(): boolean
	{
		return this._loading;
	}

	set loading(load)
	{
		if (load)
		{
			this.salesPrograms = null;
			this.onSidePanelToggle(false);
		}

		this._loading = load;
	}

	onChangeCommunity(comm: FinancialCommunity)
	{
		this.loading = true;

		if (comm != null)
		{
			this._orgService.selectCommunity(comm);
		}
	}

	get selectedSalesProgram(): SalesProgram
	{
		return this._selectedSalesProgram;
	}

	set selectedSalesProgram(item: SalesProgram)
	{
		this._selectedSalesProgram = item;
	}

	onSidePanelToggle(status: boolean)
	{
		this.sidePanelOpen = status;
	}

	save(salesProgram: SalesProgram, inactivate: boolean = false)
	{
		this.saving = true;

		salesProgram.financialCommunityId = this.selectedCommunity.id;
		salesProgram.startDate = moment(salesProgram.startDate).format('Y-MM-DD');
		salesProgram.endDate = moment(salesProgram.endDate).format('Y-MM-DD');

		// When PMC Afilliate is disabled via the side panel, we need to ensure the THO Enabled switch shows the correct value
		if (salesProgram.isWebSaleable && salesProgram.isWebSaleable !== this.selectedSalesProgram.isWebSaleable)
		{
			this.selectedSalesProgram.isWebSaleable = salesProgram.isWebSaleable;
		}

		this._salesService.saveSalesProgram(salesProgram)
			.pipe(finalize(() =>
			{
				this.saving = false;
			}))
			.subscribe(dto =>
			{
				if (!this.selectedSalesProgram)
				{
					const newSalesProgram = new SalesProgram(dto);

					// add new record and use spread to trigger table change.
					this.salesPrograms = [...this.salesPrograms, newSalesProgram];
				}
				else
				{
					this.salesPrograms.find(sp => sp.id === dto.id).dto = dto;
				}

				this.sort();
				this.onSidePanelToggle(false);

				if (inactivate)
				{
					this._msgService.add({ severity: 'success', summary: `${salesProgram.name}`, detail: `has been inactivated!` });
				}
				else
				{
					this._msgService.add({ severity: 'success', summary: `${salesProgram.name}`, detail: `has been saved!` });
				}
			},
				error =>
				{
					this._msgService.add({ severity: 'error', summary: 'Error', detail: error.message });
				});
	}

	sort()
	{
		this.salesPrograms.sort((a, b) =>
		{
			const strA = a.name.toUpperCase();
			const strB = b.name.toUpperCase();

			return strA < strB ? -1 : strA > strB ? 1 : 0;
		});
	}

	edit(salesProgram: SalesProgram)
	{
		this.selectedSalesProgram = salesProgram;

		this.onSidePanelToggle(true);
	}

	inactivate(salesProgram: SalesProgram)
	{
		this.selectedSalesProgram = salesProgram;

		const confirm = this.getConfirmModal(`Are you sure you want to inactivate the Sales Program<br /><br /> <strong>${salesProgram.name}</strong>`);

		confirm.result.then((result) =>
		{
			if (result == Constants.CONTINUE)
			{
				let currDate = new Date(moment.parseZone(moment()).toISOString()).toISOString().split('T')[0];
				let prevDate = moment(new Date(currDate).toISOString()).subtract(1, 'days').toISOString().split('T')[0];

				// set expiration date to yesterdays date
				salesProgram.dto.endDate = prevDate;

				//If the Effective Date is current date, then set both the Effective Date and Expiration Date to yesterday's date.
				if (moment(currDate).isSame(salesProgram.startDate))
				{
					salesProgram.dto.startDate = prevDate;
				}

				this.save(salesProgram.dto, true);
			}
		}, (reason) =>
		{
			console.log("Error:", reason);
		});
	}

	convertDate(date)
	{
		return moment.parseZone(date).format("M/DD/YYYY");
	}

	create()
	{
		this.selectedSalesProgram = null;

		this.onSidePanelToggle(true);
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}

	toggleThoEnabled(salesProgram: SalesProgram)
	{
		// DELETEME when THO columns are migrated to EDH
		if (!this.financialCommunityInfo)
		{
			this.financialCommunityInfo = {
				financialCommunityId: 0,
				defaultECOEMonths: null,
				earnestMoneyAmount: null,
				thoBuyerClosingCostId: null,
				thoDiscountFlatAmountId: null
			};
		}
		//end DELETEME

		this.selectedSalesProgram = salesProgram;

		const existingClosingCostProgramForTho = this.salesPrograms.find(sp => sp.isWebSaleable && sp.salesProgramType.toString() === 'BuyersClosingCost');

		const existingFlatAmountProgramForTho = this.salesPrograms.find(sp => sp.isWebSaleable && sp.salesProgramType.toString() === 'DiscountFlatAmount');

		// Discount Flat Amount
		if (salesProgram.salesProgramType.toString() === 'DiscountFlatAmount')
		{
			this.toggleDiscountFlatAmount(existingFlatAmountProgramForTho, salesProgram);
		}
		else
		{
			this.toggleClosingCostAmount(existingClosingCostProgramForTho, salesProgram);
		}
	}

	private toggleClosingCostAmount(existingClosingCostProgramForTho: SalesProgram, salesProgram: SalesProgram)
	{
		if (!salesProgram.isPMCAffiliate || (existingClosingCostProgramForTho && salesProgram.id !== existingClosingCostProgramForTho.id))
		{
			const confirm = this.getConfirmModal(`Selecting to enable this THO Sales Program will also enable PMC Affiliation and disable any other active THO Enabled BuyerClosingCost Sales Program`);

			confirm.result.then((result) =>
			{
				if (result == Constants.CONTINUE)
				{
					// DELETEME when THO columns are migrated to EDH
					this.financialCommunityInfo.thoBuyerClosingCostId = salesProgram.isWebSaleable ? null : salesProgram.id;

					this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId).subscribe(fc =>
					{
						// logic moved...
					});
					//end DELETEME

					// Toggle existing enabled closing cost
					if (existingClosingCostProgramForTho)
					{
						existingClosingCostProgramForTho.dto.isWebSaleable = existingClosingCostProgramForTho.isWebSaleable = !existingClosingCostProgramForTho.isWebSaleable;
						this.save(existingClosingCostProgramForTho.dto, false);
					}

					// Toggle isWebSaleable and assign it to the DTO for saving
					salesProgram.dto.isWebSaleable = salesProgram.isWebSaleable = !salesProgram.isWebSaleable;

					// Update isPmcAffiliate if a closing cost is being tho enabled & isPMCAffiliate is false
					if (salesProgram.isWebSaleable && !salesProgram.dto.isPMCAffiliate)
					{
						salesProgram.dto.isPMCAffiliate = true;
					}

					// #358693 Save to EDH
					this.save(salesProgram.dto, false);
				}
			}, (reason) =>
			{
				console.log("Error:", reason);
			});
		}
		else
		{
			// DELETEME when THO columns are migrated to EDH
			this.financialCommunityInfo.thoBuyerClosingCostId = salesProgram.isWebSaleable ? null : salesProgram.id;
			this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId).subscribe(fc =>
			{
				// logic moved...
			});
			//end DELETEME

			// Toggle isWebSaleable and assign it to the DTO for saving
			salesProgram.dto.isWebSaleable = salesProgram.isWebSaleable = !salesProgram.isWebSaleable;

			// #358693 Save to EDH
			this.save(salesProgram.dto, false);
		}
	}

	private toggleDiscountFlatAmount(existingFlatAmountProgramForTho: SalesProgram, salesProgram: SalesProgram)
	{
		if (existingFlatAmountProgramForTho && salesProgram.id !== existingFlatAmountProgramForTho.id)
		{
			const confirm = this.getConfirmModal(`Selecting to enable this THO Sales Program will disable any other active THO Enabled DiscountFlatAmount Sales Program`);

			confirm.result.then((result) =>
			{
				if (result == Constants.CONTINUE)
				{
					// DELETEME when THO columnns are migrated to EDH
					this.financialCommunityInfo.thoDiscountFlatAmountId = salesProgram.isWebSaleable ? null : salesProgram.id;
					this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId).subscribe(x =>
					{
						// logic moved
					});
					//end DELETEME

					// Toggle existing enabled flat amount
					existingFlatAmountProgramForTho.dto.isWebSaleable = existingFlatAmountProgramForTho.isWebSaleable = !existingFlatAmountProgramForTho.isWebSaleable;

					// Toggle isWebSaleable and assign it to the DTO for saving
					salesProgram.dto.isWebSaleable = salesProgram.isWebSaleable = !salesProgram.isWebSaleable;

					// #358693 Save to EDH
					this.save(salesProgram.dto, false);
					this.save(existingFlatAmountProgramForTho.dto, false);
				}
			}, (reason) =>
			{
				console.log("Error:", reason);
			});
		}
		else
		{
			// DELETEME when THO columnns are migrated to EDH
			this.financialCommunityInfo.thoDiscountFlatAmountId = salesProgram.isWebSaleable ? null : salesProgram.id;
			this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId).subscribe(fc =>
			{
				// logic moved...
			});
			//end DELETEME

			// Toggle isWebSaleable and assign it to the DTO for saving
			salesProgram.dto.isWebSaleable = salesProgram.isWebSaleable = !salesProgram.isWebSaleable;

			// #358693 Save to EDH
			this.save(salesProgram.dto, false);
		}
	}

	private getConfirmModal(msgBody: string): NgbModalRef
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = Constants.WARNING;
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = Constants.CANCEL;

		return confirm;
	}

	checkSpecDiscountName(name: string): boolean
	{
		return this._specDiscountService.checkIfSpecDiscount(name);
	}
}
