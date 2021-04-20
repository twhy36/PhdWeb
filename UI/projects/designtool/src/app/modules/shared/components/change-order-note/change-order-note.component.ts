import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Store, select } from '@ngrx/store';

import { UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as ChangeOrderActions from '../../../ngrx-store/change-order/actions';

@Component({
	selector: 'change-order-note',
	templateUrl: './change-order-note.component.html',
	styleUrls: ['./change-order-note.component.scss']
})
export class ChangeOrderNoteComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Output() saveNote = new EventEmitter<void>();
	@Output() cancelNote = new EventEmitter<void>();

	noteForm: FormGroup;

	get saveDisabled(): boolean
	{
		return this.noteForm.invalid;
	}

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder)
		).subscribe(changeOrder =>
		{
			if (!this.noteForm)
			{
				let desc = '';
				let note = '';

				if (changeOrder.currentChangeOrder && changeOrder.currentChangeOrder.id)
				{
					desc = changeOrder.currentChangeOrder.jobChangeOrderGroupDescription;
					note = changeOrder.currentChangeOrder.note ? changeOrder.currentChangeOrder.note.noteContent : '';
				}

				this.noteForm = new FormGroup({
					'description': new FormControl(desc),
					'note': new FormControl(note)
				});
			}
		});
	}

	onSave()
	{
		const desc = this.noteForm.get('description').value;
		this.store.dispatch(new ChangeOrderActions.SetChangeOrderDescription(desc));

		const note = this.noteForm.get('note').value;
		this.store.dispatch(new ChangeOrderActions.SetChangeOrderNote(note));

		setTimeout(() => this.saveNote.emit());
	}

	onCancel()
	{
		this.cancelNote.emit();
	}
}
