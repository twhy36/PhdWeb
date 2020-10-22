import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Validators, FormGroup, FormControl } from '@angular/forms';
import { NgbDateStruct, NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngrx/store';

import * as _ from "lodash";
import * as fromRoot from '../../../ngrx-store/reducers';
import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';
import { SalesAgreement, SalesAgreementContingency } from '../../../shared/models/sales-agreement.model';
import { SaveContingency, DeleteContingency } from '../../../ngrx-store/sales-agreement/actions';
import { NgbDateNativeAdapter } from '../../../shared/classes/ngbDatePicker/ngbDateNativeAdapter.class';
import { ModalService } from '../../../../modules/core/services/modal.service';

@Component({
	selector: 'contingency-detail',
	templateUrl: './contingency-detail.component.html',
	styleUrls: ['./contingency-detail.component.scss']
})
export class ContingencyDetailComponent extends ComponentCanNavAway implements OnInit
{
	@Input() agreement: SalesAgreement;
	@Input() position: number;
	@Input() contingency: SalesAgreementContingency;
	@Input() editing: any;
	@Input() canEdit: boolean;
	default: SalesAgreementContingency;

	@Output() onRemove = new EventEmitter<number>();
	@Output() onEdit = new EventEmitter<SalesAgreementContingency>();
	@Output() checkChanges = new EventEmitter<boolean>();

	form: FormGroup;
	expirationDate: FormControl;
	completionDate: FormControl;
	contingencyTypeDesc: FormControl;
	maxDate: NgbDate;
	maxDescriptionLength: number = 175;

	adapter: NgbDateNativeAdapter = new NgbDateNativeAdapter();
	ngbExpirationDate: NgbDate;
	ngbCompletionDate: NgbDate;

	disableForm: boolean = true;
	deleting: boolean = false;
	
	constructor(
		private store: Store<fromRoot.State>,
		private modalService: ModalService)
	{
		super();
	}

	ngOnInit()
	{
		if (this.contingency.expirationDate)
		{
			this.contingency.expirationDate = new Date(this.contingency.expirationDate);

			let utcDate = new Date();

			utcDate.setDate(this.contingency.expirationDate.getUTCDate());
			utcDate.setMonth(this.contingency.expirationDate.getUTCMonth());
			utcDate.setFullYear(this.contingency.expirationDate.getUTCFullYear());

			this.contingency.expirationDate = utcDate;
		}

		if (this.contingency.completionDate)
		{
			this.contingency.completionDate = new Date(this.contingency.completionDate);

			let utcCompletionDate = new Date();

			utcCompletionDate.setDate(this.contingency.completionDate.getUTCDate());
			utcCompletionDate.setMonth(this.contingency.completionDate.getUTCMonth());
			utcCompletionDate.setFullYear(this.contingency.completionDate.getUTCFullYear());

			this.contingency.completionDate = utcCompletionDate;
		}

		this.default = new SalesAgreementContingency({ ...this.contingency });
		this.ngbCompletionDate = this.contingency.completionDate && NgbDate.from(this.adapter.fromModel(this.contingency.completionDate));
		this.ngbExpirationDate = this.contingency.expirationDate && NgbDate.from(this.adapter.fromModel(this.contingency.expirationDate));
		this.maxDate = this.ngbExpirationDate;

		this.setFormData();
	}

	createForm()
	{
		this.form = new FormGroup({
			expirationDate: this.expirationDate,
			completionDate: this.completionDate,
			contingencyTypeDesc: this.contingencyTypeDesc
		});
	}

	setFormData()
	{
		this.expirationDate = new FormControl(this.ngbExpirationDate, [Validators.required]);
		this.completionDate = new FormControl(this.ngbCompletionDate);
		this.contingencyTypeDesc = new FormControl(this.contingency.contingencyTypeDesc || 'HouseNotSold', [Validators.required]);
		this.createForm();
	}

	onDateSelection(dateStruct: NgbDateStruct)
	{
		this.maxDate = NgbDate.from(dateStruct);
	}

	save()
	{
		const salesAgreementContingency: SalesAgreementContingency = {
			salesAgreementId: this.agreement.id,
			expirationDate: this.adapter.toModel(this.expirationDate.value),
			contingencyTypeDesc: this.contingencyTypeDesc.value
		};

		if (this.completionDate.value)
		{
			salesAgreementContingency.completionDate = this.adapter.toModel(this.completionDate.value);
		}

		if (this.contingency.id)
		{
			salesAgreementContingency.id = this.contingency.id;
		}

		this.store.dispatch(new SaveContingency(salesAgreementContingency));

	}

	edit()
	{
		this.onEdit.emit(this.contingency);
	}

	delete()
	{

		const content = "Sure you want to delete this Contigency?";

		const confirm = this.modalService.showWarningModal(content);

		confirm.subscribe((result) =>
		{
			if (result)
			{
				this.deleting = true;

				if (this.contingency.id)
				{
					this.store.dispatch(new DeleteContingency(this.contingency));
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
		if (this.contingency.id)
		{
			this.contingency = new SalesAgreementContingency(_.cloneDeep(this.default))
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

	get hasChanges()
	{
		const check = this.form && this.form.dirty;

		return check;
	}

	canNavAway(): boolean
	{
		return !this.hasChanges;
	}
}
