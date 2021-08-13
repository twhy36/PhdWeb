import { DeleteTermsAndConditions, SetSalesChangeOrderTermsAndConditions } from './../../../ngrx-store/change-order/actions';
import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Validators, FormGroup, FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';

import * as _ from "lodash";

import { Note, SalesAgreement, ModalService } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';
import { DeleteNote, SaveNote } from '../../../ngrx-store/sales-agreement/actions';

@Component({
	selector: 'sales-note',
	templateUrl: './sales-note.component.html',
	styleUrls: ['./sales-note.component.scss'],
})
export class SalesNoteComponent extends ComponentCanNavAway implements OnInit
{
	@Input() agreement: SalesAgreement;
	@Input() position: number;
	@Input() editing: any;
	@Input() note: Note;
	@Input() canEdit: boolean;
	@Input() inChangeOrder: boolean;
	default: Note;

	@Output() onRemove = new EventEmitter<number>();
	@Output() checkChanges = new EventEmitter<boolean>();
	@Output() onEdit = new EventEmitter<Note>();

	form: FormGroup;
	noteType: FormControl;
	subCategory: FormControl;
	noteContent: FormControl;

	disableForm: boolean = true;
	deleting: boolean = false;

	maxDescriptionLength: number = 3000;

	subCategoryOptions: Array<{ id: number, value: string, internal: boolean }> = [
		{ id: 5, value: 'Agreement Detail', internal: true },
		{ id: 6, value: 'Deposit', internal: true },
		{ id: 7, value: 'Financing', internal: true },
		{ id: 8, value: 'JIO/Change Order', internal: true },
		{ id: 9, value: 'Sales Agreement', internal: true },
		{ id: 10, value: 'Terms & Conditions', internal: false }
	];

	get internalCategoryOptions() {
		return this.subCategoryOptions.filter(cat => cat.internal);
	}

	get externalCategoryOptions() {
		return this.subCategoryOptions.filter(cat => !cat.internal);
	}

	get canAddPublicNote() {
		return this.agreement.status === 'Pending' || this.inChangeOrder;
	}

	get canAddInternalNote() {
		return this.agreement.status === 'Pending' || (this.agreement.status !== 'Pending' && !this.inChangeOrder);
	}

	get subCategoryName() {
		return this.subCategoryOptions.find(category => category.id === this.note.noteSubCategoryId).value;
	}
	selectedSubCategory;

	constructor(
		private store: Store<fromRoot.State>,
		private modalService: ModalService)
	{
		super();
	}

	ngOnInit()
	{
		this.default = new Note({ ...this.note });
		this.setFormData();
	}

	createForm()
	{
		this.form = new FormGroup({
			subCategory: this.subCategory,
			noteContent: this.noteContent
		});
	}

	setFormData()
	{
		// Setup form controls, only on component creation/init
		this.subCategory = new FormControl(this.note.noteSubCategoryId || null, [Validators.required]);
		this.noteContent = new FormControl(this.note.noteContent || '', [Validators.required, Validators.maxLength(this.maxDescriptionLength)]);
		this.setSelectedSubCategory(this.note.noteSubCategoryId);

		this.createForm();
	}

	selectChange()
	{
		this.setSelectedSubCategory(this.subCategory.value);
	}

	setSelectedSubCategory(id)
	{
		this.subCategory.setValue((this.agreement.status !== 'Pending' && this.inChangeOrder) ? 10 : id ? this.subCategoryOptions.find(item => item.id === id).id : null);
	}

	save()
	{
		const saveNote: Note = new Note({
			noteSubCategoryId: this.subCategory.value,
			noteType: this.subCategoryOptions.find(opt => opt.id === this.subCategory.value).internal ? 'Internal' : 'Public',
			noteContent: this.noteContent.value
		});

		if (this.note.id)
		{
			saveNote.id = this.note.id;
		}
		saveNote.noteAssoc =
		{
			id: this.agreement.id,
			type: 'salesAgreements'
		};

		if (saveNote.noteSubCategoryId === 10 && this.agreement.status !== 'Pending')
		{
			const agreementNote = this.agreement.notes.some(note => note.id === saveNote.id);
			this.store.dispatch(new SetSalesChangeOrderTermsAndConditions(saveNote, agreementNote));
		}
		else
		{
			this.store.dispatch(new SaveNote(saveNote));
		}
	}

	edit()
	{
		this.onEdit.emit(this.note);
	}

	delete()
	{
		const content = "Sure you want to delete this Note?";

		const confirm = this.modalService.showWarningModal(content);

		confirm.subscribe((result) =>
		{
			if (result)
			{
				if (this.note.noteSubCategoryId == 10 && this.agreement.status !== 'Pending')
				{
					this.store.dispatch(new DeleteTermsAndConditions(this.note))
				}
				else
				{
					this.deleting = true;

					if (this.note.id)
					{
						this.store.dispatch(new DeleteNote(this.note.id));
					}
					else
					{
						this.cancel();
					}	
				}
			}
		});
	}

	cancel()
	{
		if (this.note.id && this.note.id > 0)
		{
			this.note = new Note(_.cloneDeep(this.default))
			this.note.targetAudiences = [{name: this.note.noteSubCategoryId === 10 ? 'Public' : 'Internal' }]
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
