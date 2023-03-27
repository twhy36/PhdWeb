import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { SalesProgramTypeEnum, SalesProgram } from '../../../shared/models/salesPrograms.model';
import { ConfirmModalComponent, SidePanelComponent, SpecDiscountService } from 'phd-common';

import * as moment from "moment";
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { OrganizationService } from '../../../core/services/organization.service';
import { FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';

@Component({
	selector: 'sales-programs-side-panel-component',
	templateUrl: './sales-programs-side-panel.component.html',
	styleUrls: ['./sales-programs-side-panel.component.scss']
})
export class SalesProgramsSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent

	@Output() onSave = new EventEmitter<object>();
	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

	@Input() customClasses: string = '';
	@Input() disabled: boolean = false;
	@Input() saving: boolean = false;
	@Input() financialCommunityInfo: FinancialCommunityInfo; // DELETEME when THO columns are migrated to EDH
	@Input() selectedSalesProgram: SalesProgram;

	releaseForm: FormGroup;
	agreementLocked: boolean;
	isQMIIncentive: boolean = false;

	// Is the side panel open...
	isOpen: boolean = true;
	// The max number of characters in text input controls
	stringMaxLength: number = 250;
	// Total milliseconds in a 24 hour period, used to increment the date by 1 day.
	oneDay: number = 86400000;
	// The date object to use as the value of the startDate form control, by default it is set to the today.
	startDate: Date = new Date();
	// The date object to use as the value of the endDate form control, by default set to the day after today.
	endDate: Date = new Date(this.startDate.getTime() + this.oneDay);
	// This is the min value of the start date. While the default value of the start date is today,
	// the min value that it can be set to is yesterday.
	yesterday: Date = new Date(this.startDate.getTime() - this.oneDay);
	// The min date that the expiration can use,
	// its value changes after the startDate is set.
	minDate: Date = new Date();
	// Should only allow a max of 15 digits in the discount field.
	maxDiscount = 999999999999999;

	constructor(
		private _modalService: NgbModal,
		private _orgService: OrganizationService,
		private _specDiscountService: SpecDiscountService
	) { }

	ngOnInit()
	{
		this.agreementLocked = this.selectedSalesProgram ? this.selectedSalesProgram.agreementLocked : false;
		this.isQMIIncentive = this._specDiscountService.checkIfSpecDiscount(this?.selectedSalesProgram?.name);
		this.createForm();
	}

	get isDirty(): boolean
	{
		return this.releaseForm.dirty;
	}

	get canSave(): boolean
	{
		return this.releaseForm.pristine || !this.releaseForm.valid || this.saving || this.validateIfSpecDiscount();
	}

	//Check to see if the name of the Sales Program contains 'Quick Move In Incentive'
	validateIfSpecDiscount(): boolean
	{
		if (this.releaseForm.get('name')?.disabled && this._specDiscountService.checkIfSpecDiscount(this.releaseForm.get('name')?.value))
		{
			return false;
		}
		else
		{
			const hasQuick = this.releaseForm.get('name')?.value?.toLowerCase()?.indexOf('quick') > -1;
			const hasMove = this.releaseForm.get('name')?.value?.toLowerCase()?.indexOf('move') > -1;
			const hasIn = this.releaseForm.get('name')?.value?.toLowerCase()?.indexOf('in') > -1;
			const hasIncentive = this.releaseForm.get('name')?.value?.toLowerCase()?.indexOf('incentive') > -1;

			return hasQuick && hasMove && hasIn && hasIncentive;
		}
	}

	convertDate(date)
	{
		return moment.parseZone(date).format("M/DD/YYYY");
	}

	createForm()
	{
		let salesProgramType = this.selectedSalesProgram ? this.selectedSalesProgram.salesProgramType : null;
		let maximumAmount = this.selectedSalesProgram ? this.selectedSalesProgram.maximumAmount : null;
		let name = this.selectedSalesProgram ? this.selectedSalesProgram.name : null;
		let isPmcAffiliate = this.selectedSalesProgram ? this.selectedSalesProgram.isPMCAffiliate : null;

		this.startDate = this.selectedSalesProgram ? new Date(this.convertDate(this.selectedSalesProgram.startDate)) : this.startDate;
		this.endDate = this.selectedSalesProgram ? new Date(this.convertDate(this.selectedSalesProgram.endDate)) : this.endDate;

		// assign form controls
		this.releaseForm = new FormGroup({
			'startDate': new FormControl(this.startDate, [Validators.required, Validators.maxLength(this.stringMaxLength)]),
			'endDate': new FormControl(this.endDate, [Validators.required]),
			'salesProgramType': new FormControl(salesProgramType, [Validators.required]),
			'maximumAmount': new FormControl(maximumAmount, [Validators.required, Validators.max(this.maxDiscount), Validators.min(1)]),
			'name': new FormControl(name, [Validators.required]),
			'isPMCAffiliate': new FormControl(isPmcAffiliate)
		});

		// if this is an edit, assign additional form controls
		if (this.selectedSalesProgram)
		{
			this.releaseForm.addControl('id', new FormControl(this.selectedSalesProgram.id));
			this.releaseForm.addControl('createdBy', new FormControl(this.selectedSalesProgram.createdBy));
			this.releaseForm.addControl('createdUtcDate', new FormControl(this.selectedSalesProgram.createdUtcDate));
			this.releaseForm.addControl('isWebSaleable', new FormControl(this.selectedSalesProgram.isWebSaleable));
		}

		if (this.agreementLocked)
		{
			this.releaseForm.get('isPMCAffiliate').disable();
			this.releaseForm.get('startDate').disable();
			this.releaseForm.get('salesProgramType').disable();
			this.releaseForm.get('maximumAmount').disable();
			this.releaseForm.get('name').disable();
		}

		if (this.isQMIIncentive)
		{
			this.releaseForm.get('salesProgramType').disable();
			this.releaseForm.get('name').disable();
			this.releaseForm.get('startDate').disable();
			this.releaseForm.get('endDate').disable();
			this.releaseForm.get('isPMCAffiliate').disable();
		}

		// we have to set the min date AFTER creating the form controls,
		// since setEndDateMinDate sets form controls.
		this.setMinimumEndDate();
		this.releaseForm.updateValueAndValidity();
	}

	onClick(event: any)
	{
		if (this.selectedSalesProgram?.isWebSaleable && this.selectedSalesProgram?.isPMCAffiliate && this.selectedSalesProgram?.salesProgramType.toString() === 'BuyersClosingCost')
		{
			event.preventDefault();

			let ngbModalOptions: NgbModalOptions = {
				centered: true,
				backdrop: 'static',
				keyboard: false
			};

			let msgBody = `Unchecking PMC Affiliate will disable THO Enabled flag. Do you want to continue?`;

			let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

			confirm.componentInstance.title = 'Warning!';
			confirm.componentInstance.body = msgBody;
			confirm.componentInstance.defaultOption = 'Cancel';

			confirm.result.then((result) =>
			{
				if (result == 'Continue')
				{
					// DELETEME when THO columns are migrated to EDH
					this.financialCommunityInfo.thoBuyerClosingCostId = null;

					this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, null).subscribe(fcInfo =>
					{
						// logic moved...
					});
					//end DELETEME

					this.releaseForm.controls.isWebSaleable.setValue(!this.selectedSalesProgram.isWebSaleable);
					this.releaseForm.controls.isPMCAffiliate.setValue(!event.target.checked);
					this.releaseForm.controls.isPMCAffiliate.markAsDirty();
				}
			}, (reason) =>
			{
				console.log("Error:", reason);
			});
		}
		else
		{
			this.releaseForm.controls.isPMCAffiliate.setValue(event.target.checked);
			this.releaseForm.controls.isPMCAffiliate.markAsDirty();
		}
	}

	// Sets the min date the endDate calendar is allowed to be set to.
	// It is set during form creation and after startDate is set.
	setMinimumEndDate(dateSet: Date = this.startDate)
	{
		// When the startDate is set, is passes the set value as a parameter,
		// and the min endDate would potentially be one day after the start date...
		this.minDate = new Date(dateSet.getTime() + this.oneDay);

		// However, if the endDate is already set more than one day after the start date, there is no need to alter it.
		if (this.releaseForm.value.endDate.getTime() < this.minDate.getTime())
		{
			this.releaseForm.controls.endDate.setValue(this.minDate);
		}
	}

	save()
	{
		if (this.releaseForm.valid)
		{
			this.onSave.emit(this.releaseForm.getRawValue() as SalesProgram);
		}
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel();
	}

	get salesProgramTypes(): Array<string>
	{
		// gets a list of the eNums and adds a space before each capital letter
		return [...this.enumKeys(SalesProgramTypeEnum)];
	}

	// This should probably go into some utility module.
	enumKeys(enumType)
	{
		//grab enum key and values -- return keys
		return Object.keys(enumType).filter(
			type => isNaN(<any>type)
		);
	}
}
