import { Component, OnInit, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Validators, FormGroup, FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';

import * as _ from "lodash";
import * as fromRoot from '../../../ngrx-store/reducers';
import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';

import { SalesAgreement } from '@shared/models/sales-agreement.model';
import { Note } from '../../../shared/models/note.model';
import { DeleteNote, SaveNote } from '../../../ngrx-store/sales-agreement/actions';
import { ModalService } from '../../../../modules/core/services/modal.service';

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

	default: Note;

	@Output() onRemove = new EventEmitter<number>();
	@Output() checkChanges = new EventEmitter<boolean>();
	@Output() onEdit = new EventEmitter<Note>();

	form: FormGroup;
	subCategory: FormControl;
	noteType: FormControl;
	noteContent: FormControl;

	disableForm: boolean = true;
	deleting: boolean = false;

	maxDescriptionLength: number = 3000;

	subCategoryOptions: Array<{ id: number, value: string }> = [
		{ id: 5, value: 'Agreement Detail' },
		{ id: 6, value: 'Deposit' },
		{ id: 7, value: 'Financing' },
		{ id: 8, value: 'JIO/Change Order' },
		{ id: 9, value: 'Sales Agreement' },
		{ id: 10, value: 'Terms & Conditions' }
	];

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
			noteType: this.noteType,
			noteContent: this.noteContent
		});
	}

	setFormData()
	{
		// Setup form controls, only on component creation/init
		this.subCategory = new FormControl(this.note.noteSubCategoryId || null, [Validators.required]);
		this.noteType = new FormControl(this.note.targetAudiences && this.note.targetAudiences.length > 0 && this.note.targetAudiences[0].name || null, [Validators.required]);
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
		this.selectedSubCategory = this.subCategoryOptions.find(item => item.id === id);
	}

	save()
	{
		const saveNote: Note = new Note({
			noteSubCategoryId: this.subCategory.value,
			noteType: this.noteType.value,
			noteContent: this.noteContent.value,
			notTargetAudienceAssocs: new Array(this.noteType.value)
		});

		if (this.note.id)
		{
			saveNote.id = this.note.id;
		}

		saveNote.noteAssoc =
			{
				id: this.agreement.id,
				type: 'salesAgreements'
			}

		this.store.dispatch(new SaveNote(saveNote));
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
		});
	}

	cancel()
	{
		if (this.note.id && this.note.id > 0)
		{
			this.note = new Note(_.cloneDeep(this.default))
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
