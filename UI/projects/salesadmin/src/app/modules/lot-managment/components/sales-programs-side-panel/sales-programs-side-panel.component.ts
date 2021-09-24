import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { SalesProgramTypeEnum, SalesProgram } from '../../../shared/models/salesPrograms.model';
import { ConfirmModalComponent, SidePanelComponent } from 'phd-common';

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
	@Input() financialCommunityInfo: FinancialCommunityInfo;
	@Input() selected: SalesProgram;

	releaseForm: FormGroup;
	agreementLocked: boolean;

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
		private _orgService: OrganizationService
	) { }

	ngOnInit()
	{
		this.agreementLocked = this.selected ? this.selected.agreementLocked : false;
		this.createForm();
	}

	get isDirty(): boolean
	{
		return this.releaseForm.dirty;
	}

	get canSave(): boolean
	{
		return this.releaseForm.pristine || !this.releaseForm.valid || this.saving;
	}

	convertDate(date)
	{
		return moment.parseZone(date).format("M/DD/YYYY");
	}

	createForm()
	{
		let salesProgramType = this.selected ? this.selected.salesProgramType : null;
		let maximumAmount = this.selected ? this.selected.maximumAmount : null;
		let name = this.selected ? this.selected.name : null;
		let isPmcAffiliate = this.selected ? this.selected.isPMCAffiliate : null;

		this.startDate = this.selected ? new Date(this.convertDate(this.selected.startDate)) : this.startDate;
		this.endDate = this.selected ? new Date(this.convertDate(this.selected.endDate)) : this.endDate;

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
		if (this.selected)
		{
			this.releaseForm.addControl('id', new FormControl(this.selected.id));
			this.releaseForm.addControl('createdBy', new FormControl(this.selected.createdBy));
			this.releaseForm.addControl('createdUtcDate', new FormControl(this.selected.createdUtcDate));
		}

		if (this.agreementLocked)
		{
			this.releaseForm.get('isPMCAffiliate').disable();
			this.releaseForm.get('startDate').disable();
			this.releaseForm.get('salesProgramType').disable();
			this.releaseForm.get('maximumAmount').disable();
			this.releaseForm.get('name').disable();
		}

		// we have to set the min date AFTER creating the form controls,
		// since setEndDateMinDate sets form controls.
		this.setMinimumEndDate();
		this.releaseForm.updateValueAndValidity();
	}

	onClick(event: any)
	{
		if (this.selected?.isThoEnabled && this.selected?.isPMCAffiliate && this.selected?.salesProgramType.toString() === 'BuyersClosingCost')
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
					this.financialCommunityInfo.thoBuyerClosingCostId = null;

					this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo,null).subscribe(fcInfo =>
					{
						this.selected.isThoEnabled = !this.selected.isThoEnabled;
						this.releaseForm.controls.isPMCAffiliate.setValue(!event.target.checked);
						this.releaseForm.controls.isPMCAffiliate.markAsDirty();
					});
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
