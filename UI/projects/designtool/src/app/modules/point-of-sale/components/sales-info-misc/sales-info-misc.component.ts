import { Component, OnInit, ViewEncapsulation, Input, OnChanges, SimpleChanges, EventEmitter, Output } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { NgbCalendar, NgbDateStruct, NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngrx/store';

import { SalesAgreement, convertDateToUtcString } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';
import { UpdateSalesAgreement } from '../../../ngrx-store/sales-agreement/actions';
import { NgbDateNativeAdapter } from '../../../shared/classes/ngbDatePicker/ngbDateNativeAdapter.class';

@Component({
	selector: 'sales-info-misc',
	templateUrl: './sales-info-misc.component.html',
	styleUrls: ['./sales-info-misc.component.scss'],
	// disabling encapsulation so we can style some of the embedded components, like the calendar, from this CSS.
	// The trade off is wrapping all CSS in the top container so it doesn't accidentally apply elsewhere.
	encapsulation: ViewEncapsulation.None
})

export class SalesInfoMiscComponent extends ComponentCanNavAway implements OnInit, OnChanges
{
	@Input() agreement: SalesAgreement;
	@Input() savingSalesAgreement: boolean;
	@Input() saveError: boolean;
	@Input() editing: any;
	@Input() canEdit: boolean;
	@Input() canUpdateECOE: boolean;
	@Input() jobsProjectedFinalDate: Date = null;

	@Output() onEdit = new EventEmitter<SalesAgreement>();

	selectedLenderType;
	selectedPropertyType;
	selectedQuoteRequested;

	// Should get these from API (which we will in #165395) from SalesAgreements,
	// except we still need to modify for display
	lenderTypes: Array<any> = ['PulteMortgage', 'OutsideLender', 'Cash'];
	propertyTypes: Array<any> = ['Primary', 'Secondary', 'Investment'];
	lenderTypesDisplay = {
		'PulteMortgage': 'Pulte Mortgage',
		'OutsideLender': 'OSL (Outside Lender)',
		'Cash': 'Cash'
	};

	// Form data
	salesInfoForm: FormGroup;
	ecoeDate: NgbDate;
	minDate: NgbDate;
	dateDisplay; // holds the display value of the ECOE date

	adapter: NgbDateNativeAdapter = new NgbDateNativeAdapter();

	constructor(
		private calendar: NgbCalendar,
		private fb: FormBuilder,
		private store: Store<fromRoot.State>
	)
	{
		super();

		this.minDate = calendar.getToday();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (!!changes.agreement && !!changes.agreement.currentValue && !!!changes.agreement.firstChange)
		{
			this.initializeData();
		}
	}

	ngOnInit()
	{
		if (this.jobsProjectedFinalDate)
		{
			let ngbDate = NgbDate.from(this.adapter.fromModel(new Date(convertDateToUtcString(this.jobsProjectedFinalDate))));

			if (ngbDate)
			{
				ngbDate.day++;

				this.minDate = ngbDate;
			}
		}

		this.initializeData();
		this.createForm();
	}

	save()
	{
		// get date objects from NgbDates
		const ecoeDate = this.adapter.toModel(this.salesInfoForm.get('ecoeDate').value);
		const agreement: SalesAgreement = new SalesAgreement(
			{
				id: this.agreement.id,
				status: this.agreement.status,
				propertyType: this.propertyTypes[this.salesInfoForm.get('propertyType').value - 1],
				lenderType: this.lenderTypes[this.salesInfoForm.get('lenderType').value - 1],
				insuranceQuoteOptIn: this.salesInfoForm.get('quoteRequested').value === true,
				ecoeDate: ecoeDate
			}
		);

		this.store.dispatch(new UpdateSalesAgreement(agreement));
	}

	edit()
	{
		this.onEdit.emit(this.agreement);
	}

	cancel()
	{
		this.initializeData();
		this.salesInfoForm.get('lenderType').setValue(this.selectedLenderType);
		this.salesInfoForm.get('propertyType').setValue(this.selectedPropertyType);
		this.salesInfoForm.get('quoteRequested').setValue(this.selectedQuoteRequested);

		if (!this.agreement.ecoeDate)
		{
			this.salesInfoForm.get('ecoeDate').setValue(this.ecoeDate || null);
		}

		this.onEdit.emit(null);
	}

	onDateSelection(dateStruct: NgbDateStruct)
	{
		this.setDateDisplay();
	}

	private initializeData()
	{
		this.agreement.ecoeDate = this.agreement.ecoeDate ? new Date(convertDateToUtcString(this.agreement.ecoeDate)) : null;
		this.ecoeDate = NgbDate.from(this.adapter.fromModel(this.agreement.ecoeDate));
		this.setDateDisplay();
		this.selectedLenderType = this.agreement.lenderType && this.lenderTypes.indexOf(this.agreement.lenderType) + 1;
		this.selectedPropertyType = this.agreement.propertyType && this.propertyTypes.indexOf(this.agreement.propertyType) + 1;
		this.selectedQuoteRequested = this.agreement.insuranceQuoteOptIn;
	}

	private createForm()
	{
		this.salesInfoForm = this.fb.group({
			ecoeDate: [{ value: this.ecoeDate || null, disabled: !this.canEdit && !this.canUpdateECOE }, [Validators.required]],
			lenderType: [{ value: this.selectedLenderType, disabled: !this.canEdit }, [Validators.required]],
			propertyType: [{ value: this.selectedPropertyType, disabled: !this.canEdit }, [Validators.required]],
			quoteRequested: [{ value: this.selectedQuoteRequested, disabled: !this.canEdit }, [Validators.required]]
		});
	}

	private setDateDisplay()
	{
		const dateStr: string = this.ecoeDate ? `${this.ecoeDate.month}/${this.ecoeDate.day}/${this.ecoeDate.year}` : '';
		this.dateDisplay = 'Estimated COE: ' + dateStr;
	}

	get hasChanges()
	{
		return this.salesInfoForm && this.salesInfoForm.dirty;
	}

	canNavAway(): boolean
	{
		return !this.hasChanges;
	}
}
