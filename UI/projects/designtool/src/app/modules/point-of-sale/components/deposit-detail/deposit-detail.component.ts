import { Component, OnInit, Input, EventEmitter, Output, ViewChild } from '@angular/core';
import { Validators, UntypedFormGroup, UntypedFormControl } from '@angular/forms';
import { Store } from '@ngrx/store';

import * as _ from "lodash";
import * as fromRoot from '../../../ngrx-store/reducers';
import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';

import { SalesAgreementDeposit, SalesAgreement, ModalService, convertDateToUtcString } from 'phd-common';
import { SaveDeposit, DeleteDeposit, DepositSaved } from '../../../ngrx-store/sales-agreement/actions';
import { NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { NgbDateNativeAdapter } from '../../../shared/classes/ngbDatePicker/ngbDateNativeAdapter.class';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { SalesAgreementService } from '../../../core/services/sales-agreement.service';

@Component({
	selector: 'deposit-detail',
	templateUrl: './deposit-detail.component.html',
	styleUrls: ['./deposit-detail.component.scss'],
})
export class DepositDetailComponent extends ComponentCanNavAway implements OnInit
{
	@ViewChild('dueDatePicker') dueDatePicker: NgbInputDatepicker;
	@ViewChild('paidDatePicker') paidDatePicker: NgbInputDatepicker;

	@Input() agreement: SalesAgreement;
	@Input() position: number;
	@Input() editing: any;
	@Input() deposit: SalesAgreementDeposit;
	@Input() canEdit: boolean;
	@Input() canDelete: boolean;
	default: SalesAgreementDeposit;

	@Output() onRemove = new EventEmitter<number>();
	@Output() checkChanges = new EventEmitter<boolean>();
	@Output() onEdit = new EventEmitter<SalesAgreementDeposit>();

	form: UntypedFormGroup;
	depositTypeDesc: UntypedFormControl;
	amount: UntypedFormControl;
	description: UntypedFormControl;
	dueDate: UntypedFormControl;
	paidDate: UntypedFormControl;
	processElectronically: UntypedFormControl;

	hasEBillInvoice: boolean;
	paidDateReadonly: boolean = true;

	adapter: NgbDateNativeAdapter = new NgbDateNativeAdapter();
	ngbDueDate: NgbDate;
	ngbPaidDate: NgbDate;

	disableForm: boolean = true;
	deleting: boolean = false;

	maxDescriptionLength: number = 50;

	constructor(
		private store: Store<fromRoot.State>,
		private salesAgreementService: SalesAgreementService,
		private modalService: ModalService)
	{
		super();
	}

	ngOnInit()
	{
		this.deposit.dueDate = new Date(convertDateToUtcString(this.deposit.dueDate));

		if (this.deposit.paidDate)
		{
			this.deposit.paidDate = new Date(convertDateToUtcString(this.deposit.paidDate));
		}

		this.default = new SalesAgreementDeposit({ ...this.deposit });
		this.ngbDueDate = this.deposit.dueDate && NgbDate.from(this.adapter.fromModel(this.deposit.dueDate));
		this.ngbPaidDate = this.deposit.paidDate && NgbDate.from(this.adapter.fromModel(this.deposit.paidDate));

		if (this.deposit.id && !this.deposit.paidDate)
		{
			this.salesAgreementService.depositHasInvoice(this.deposit).subscribe(hasInvoice =>
			{
				this.hasEBillInvoice = hasInvoice;
				this.paidDateReadonly = hasInvoice;
				this.setFormData();
			});

			this.salesAgreementService.getDeposit(this.agreement.id, this.deposit.id).subscribe(deposit =>
			{
				if (deposit.paidDate)
				{
					this.deposit.paidDate = deposit.paidDate;
					this.store.dispatch(new DepositSaved(deposit));
				}
			});

		}
		else
		{
			this.setFormData();
		}
	}

	createForm()
	{
		this.form = new UntypedFormGroup({
			description: this.description,
			amount: this.amount,
			depositTypeDesc: this.depositTypeDesc,
			dueDate: this.dueDate,
			paidDate: this.paidDate,
			processElectronically: this.processElectronically
		});
	}

	setFormData()
	{
		// Setup form controls, only on component creation/init
		this.description = new UntypedFormControl(this.deposit.description || null, [Validators.maxLength(this.maxDescriptionLength)]);
		this.amount = new UntypedFormControl(this.deposit.amount ? this.formatDepositAmount(this.deposit.amount) : null, [Validators.max(999999999999999), Validators.pattern(/^-?\d*[.,]?\d{0,2}$/), Validators.required]);
		this.depositTypeDesc = new UntypedFormControl(this.deposit.depositTypeDesc || '', [Validators.required]);
		this.dueDate = new UntypedFormControl(this.ngbDueDate, [Validators.required]);
		this.paidDate = new UntypedFormControl(this.ngbPaidDate);
		this.processElectronically = new UntypedFormControl({ value: this.deposit.id ? this.hasEBillInvoice : true, disabled: this.deposit.id && (!!this.deposit.paidDate || this.hasEBillInvoice) });

		this.createForm();
	}

	toggleEBill(event: any)
	{
		this.paidDateReadonly = event.target.checked;
	}

	save()
	{
		const salesAgreementDeposit: SalesAgreementDeposit = {
			description: this.description.value,
			amount: this.amount.value * 1,
			depositTypeDesc: this.depositTypeDesc.value,
			dueDate: this.adapter.toModel(this.dueDate.value),
			salesAgreementId: this.agreement.id
		};

		if (this.deposit.id)
		{
			salesAgreementDeposit.id = this.deposit.id;
		}

		if (!this.processElectronically.value)
		{
			salesAgreementDeposit.paidDate = this.adapter.toModel(this.paidDate.value);
		}

		this.store.dispatch(new SaveDeposit(salesAgreementDeposit, this.processElectronically.value));
	}

	edit()
	{
		this.onEdit.emit(this.deposit);
	}

	delete()
	{
		const content = "Sure you want to delete this Deposit?";
		const confirm = this.modalService.showWarningModal(content);

		confirm.subscribe((result) =>
		{
			if (result)
			{
				this.deleting = true;

				if (this.deposit.id)
				{
					this.store.dispatch(new DeleteDeposit(this.deposit));
				}
				else
				{
					this.cancel();
				}
			}
		});
	}

	cancel()
	{
		if (this.deposit.id && this.deposit.id > 0)
		{
			this.deposit = new SalesAgreementDeposit(_.cloneDeep(this.default));

			this.setFormData();
		}
		else
		{
			this.remove();
		}
		this.onEdit.emit(null);
	}

	remove()
	{
		this.onRemove.emit(this.position);
	}

	toggle(picker: NgbInputDatepicker)
	{
		if (picker === this.paidDatePicker)
		{
			//don't allow editing due date if it has already been paid
			if (this.deposit.paidDate || this.paidDateReadonly)
			{
				return;
			}

			if (this.dueDatePicker.isOpen())
			{
				this.dueDatePicker.close();
			}
		}
		else if (picker === this.dueDatePicker)
		{
			if (this.paidDatePicker && this.paidDatePicker.isOpen())
			{
				this.paidDatePicker.close();
			}
		}

		picker.toggle();
	}

	get hasChanges()
	{
		const check = this.form && this.form.dirty;

		return check;
	}

	canNavAway(): boolean
	{
		return !this.hasChanges;
	}

	formatDepositAmount(amount: number)
	{
		let formatedAmount = amount.toLocaleString('en-US', { minimumFractionDigits: 2 });

		formatedAmount = formatedAmount.replace(/,/g, '');

		return formatedAmount;
	}
}
