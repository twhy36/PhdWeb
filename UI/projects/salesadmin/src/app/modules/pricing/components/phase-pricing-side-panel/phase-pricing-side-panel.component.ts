import { Component, OnInit, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { ISalesPhase, ISalesPhasePlan, ILot } from '../../../shared/models/pricing.model';

import { OrganizationService } from '../../../core/services/organization.service';
import { PricingService } from '../../../core/services/pricing.service';

import { ConfirmModalComponent, SidePanelComponent } from 'phd-common';

@Component({
	selector: 'phase-pricing-side-panel-component',
	templateUrl: './phase-pricing-side-panel.component.html',
	styleUrls: ['./phase-pricing-side-panel.component.scss']
})
export class PhasePricingSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Output() onSaveSalesPhase = new EventEmitter<any>();
	@Input() sidePanelOpen: boolean = false;
	@Input() saving: boolean;
	@Input() salesPhases: ISalesPhase[];
	@Input() activePhase: ISalesPhase;

	selectedCommunityLots: ILot[] = [];
	salesPhase: ISalesPhase;
	phasePriceForm: FormGroup;
	selectedItems: Array<ILot> = [];
	sidePanelLots: Array<ILot> = [];
	filteredLotTags: Array<ILot> = [];
	oldLotsAssignedToPhase: Array<ILot> = [];

	descriptionNamePattern = "/(^|\W)List Price($|\W)/i";
	isOpen: boolean = true;

	get isDirty(): boolean
	{
		return this.phasePriceForm.dirty;
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = this.phasePriceForm.pristine || !this.phasePriceForm.valid;

		return saveDisabled;
	}

	constructor(private orgService: OrganizationService, private _pricingService: PricingService, private _modalService: NgbModal)
	{
	}

	ngOnInit()
	{
		this.createForm();
		this.getFinancialCommunityLots();
	}

	createForm()
	{
		const lastPhase = this.activePhase || this.salesPhases[this.salesPhases.length - 1];

		this.salesPhase = {
			id: this.activePhase ? lastPhase.id : 0,
			salesPhaseName: this.activePhase ? this.activePhase.salesPhaseName : "",
			lots: this.activePhase ? this.activePhase.lots : [],
			phasePlans: lastPhase.phasePlans.map(pp =>
				<ISalesPhasePlan>{
					listPrice: pp.listPrice,
					plan: {
						id: pp.plan.id
					}
				})
		};

		this.phasePriceForm = new FormGroup({
			'salesPhaseName': new FormControl(this.salesPhase.salesPhaseName, [Validators.required, this.duplicateName(), this.excludeName()]),
			'lotsPendingSelection': new FormControl(),
			'selectedLots': new FormControl(this.selectedItems.length > 0 ? '1' : '')
		});

		this.salesPhase.phasePlans.forEach((p, i) =>
		{
			let validators: ValidatorFn[] = [];

			validators.push(Validators.min(0));

			const phasePlan = this.salesPhases[0].phasePlans.find(x => x.plan.id === p.plan.id);
			if (phasePlan && phasePlan.plan.isActive)
			{
				validators.push(Validators.required);
			}

			const isPhasePlanActive = phasePlan && phasePlan.plan.isActive;
			this.phasePriceForm.addControl(p.plan.id.toString(), new FormControl({ value: p.listPrice, disabled: !isPhasePlanActive }, validators));
		});
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel();
	}

	saveSalesPhase()
	{
		this.salesPhase.salesPhaseName = this.phasePriceForm.get('salesPhaseName').value;
		this.salesPhase.lots = this.selectedItems;

		this.salesPhase.phasePlans.forEach(p =>
		{
			p.listPrice = +this.phasePriceForm.controls[p.plan.id].value;
		});

		this.filterOldLotsAssignedToPhase();

		if (this.selectedItems.some(l => ['Sold', 'Closed'].indexOf(l.lotStatusDescription) !== -1))
		{
			this.showPrompt();
		}
		else
		{
			this.onSaveSalesPhase.emit({ newSalesPhase: this.salesPhase, oldSalesPhaseLotAssoc: this.oldLotsAssignedToPhase });
		}
	}

	filterOldLotsAssignedToPhase()
	{
		let newSelectedLots = this.selectedItems.map(l => JSON.stringify(l));
		let oldDeselectedAssignedLots = this.oldLotsAssignedToPhase.map(l => JSON.stringify(l));
		let filteredOldLotAssoc = oldDeselectedAssignedLots.filter(l => { return newSelectedLots.indexOf(l) === -1 });

		this.oldLotsAssignedToPhase = filteredOldLotAssoc.map(l => JSON.parse(l));
	}

	getFinancialCommunityLots()
	{
		let selectedFinancialCommunityId = this.orgService.currentFinancialCommunityId;

		this._pricingService.getCommunityLots(selectedFinancialCommunityId).subscribe(lots =>
		{
			this.selectedItems = [];
			this.selectedCommunityLots = lots;
			this.updateFilteredLotTagsFromFilteredLots();

			if (this.activePhase !== null)
			{
				this.selectedItems = lots.filter(l => l.salesPhaseId === this.activePhase.id);
			}

			this.oldLotsAssignedToPhase = JSON.parse(JSON.stringify(this.selectedItems));
		})
	}

	controlHasErrors(control: AbstractControl)
	{
		return control.invalid && (control.dirty || control.touched);
	}

	duplicateName(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			if (this.salesPhase)
			{
				return null;
			}

			let inputName = control.value as string;
			let existingName = inputName ? this.salesPhases.find(n => n.salesPhaseName.toLowerCase() === inputName.toLowerCase()) : null;

			return existingName ? { duplicateName: true } : null;
		};
	}

	excludeName(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			let inputName = control.value as string;
			let excludedName = "List Price";
			let existingName = inputName ? (excludedName.replace(' ', '').toLowerCase() === inputName.replace(' ', '').toLowerCase()) : null;

			return existingName ? { excludeName: true } : null;
		};
	}

	addHighlightedItems()
	{
		for (let tagId of this.phasePriceForm.controls['lotsPendingSelection'].value)
		{
			var currentTag = this.filteredLotTags.filter(t => t.id === tagId);

			if (currentTag.length !== 0)
			{
				const index = this.filteredLotTags.indexOf(currentTag[0]);

				if (index !== -1)
				{
					this.filteredLotTags.splice(index, 1);
				}
			}

			if (currentTag.length !== 0)
			{
				this.selectedItems.push(currentTag[0]);
			}
		}

		this.setSelectedLotValue();
	}

	updateFilteredLotTagsFromFilteredLots()
	{
		this.filteredLotTags = this.selectedCommunityLots.filter(l => l.salesPhaseId === null && ['Sold', 'Closed'].indexOf(l.lotStatusDescription) === -1);
	}

	setSelectedLotValue()
	{
		const control = this.phasePriceForm.get('selectedLots');

		control.setValue(this.selectedItems.length > 0 ? '1' : '');
		control.markAsDirty();
	}

	addAllItems()
	{
		this.filteredLotTags.forEach(lot =>
		{
			this.selectedItems.push(lot);
		});

		this.filteredLotTags = [];
		this.setSelectedLotValue();
	}

	removeAllItems()
	{
		const soldItems = [];

		this.selectedItems.forEach(lot =>
		{
			if (lot.lotStatusDescription !== 'Closed' && lot.lotStatusDescription !== 'Sold')
			{
				this.filteredLotTags.push(lot);
			}
			else
			{
				soldItems.push(lot);
			}
		});

		this.selectedItems = soldItems;
	}

	removeItem(tag: ILot)
	{
		const items = this.selectedItems;

		if (tag)
		{
			const lots = this.selectedCommunityLots;
			const index = items.indexOf(tag);

			if (index !== -1)
			{
				items.splice(index, 1);
			}

			const lot = lots.find(l => l.id === tag.id);

			if (lot)
			{
				this.filteredLotTags.push(lot);
			}
		}

		this.setSelectedLotValue();
	}

	showPrompt()
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let msgBody = 'One or more assigned lots have a contract and will not be added to the Phase';

		let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this.onSaveSalesPhase.emit({ newSalesPhase: this.salesPhase, oldSalesPhaseLotAssoc: this.oldLotsAssignedToPhase });
			}
			else
			{

			}
		}, (reason) =>
		{

		});
	}

	getPhasePlanName(phase: ISalesPhasePlan): string {
		const phasePlan = this.salesPhases[0].phasePlans.find(x => x.plan.id === phase.plan.id);
		return phasePlan ? phasePlan.plan.salesName : '';
	}
}
