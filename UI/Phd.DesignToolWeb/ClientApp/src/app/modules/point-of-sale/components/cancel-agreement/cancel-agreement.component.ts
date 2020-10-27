import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';

import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';

import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';
import * as CommonActions from '../../../ngrx-store/actions';

import { SalesAgreementCancelReason, SalesAgreement } from '../../../shared/models/sales-agreement.model';
import { SalesAgreementService } from '../../../core/services/sales-agreement.service';
import { Note, TargetAudienceTypeEnum } from '../../../shared/models/note.model';
import { switchMap } from 'rxjs/operators';

@Component({
	selector: 'cancel-agreement',
	templateUrl: './cancel-agreement.component.html',
	styleUrls: ['./cancel-agreement.component.scss']
})
export class CancelAgreementComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() displaySaveAndView: boolean = false;
	@Output() close = new EventEmitter<void>();
	@Input() agreement: SalesAgreement;

	cancelForm: FormGroup;
	cancelDate: Date = new Date();
	constructionStageName: string;

	salesAgreementCancelReason = SalesAgreementCancelReason;
	salesAgreementId: number;

	buildType: string;
	reasonValue: string;
	default: Note;

	constructor(private store: Store<fromRoot.State>, private _saService: SalesAgreementService) { super(); }

	get canContinue(): boolean
	{
		return !this.cancelForm.valid;
	}

	get disableButtons()
	{
		return this.canContinue;
	}

	get revertToSpecBtnName(): string
	{
		return this.constructionStageName == 'Configured' ? 'Revert To Spec' : 'Ok';
	}
	
	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(store => store.salesAgreement)
		).subscribe(sa =>
		{
			this.salesAgreementId = sa.id;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(store => store.job.constructionStageName)
		).subscribe(stageName => {
			this.constructionStageName = stageName;
		});

		if (this.agreement.cancellations)
		{
			this.default = new Note({ ...this.agreement.cancellations.note });
			this.reasonValue = this.agreement.cancellations.cancelReasonDesc ? this.salesAgreementCancelReason[this.agreement.cancellations.cancelReasonDesc] : null;
		}

		this.createForm();
	}

	createForm()
	{
		this.cancelForm = new FormGroup({
			'reason': new FormControl(this.reasonValue || null, Validators.required),
			'detail': new FormControl(this.default && this.default.noteContent || '')
		});
	}

	saveAndViewAgreement()
	{
		let reason = this.cancelForm.get('reason').value;
		let noteContent = this.cancelForm.get('detail').value;
		let reasonKey = Object.keys(SalesAgreementCancelReason).find(key => this.salesAgreementCancelReason[key] === reason);

		var note: Note = {
			id: this.default ? this.default.id : 0,
			noteContent: noteContent,
			noteType: TargetAudienceTypeEnum.Public,
			noteSubCategoryId: 4,
			noteAssoc: {
				id: this.salesAgreementId,
				type: TargetAudienceTypeEnum.Public
			}
		};

		this._saService.saveNote(note).pipe(
			switchMap(notes => {
				return this._saService.createSalesAgreementCancellation(this.salesAgreementId, notes.id, reasonKey);
			})
		).subscribe(cancelInfo => {
			this.store.dispatch(new SalesAgreementActions.SalesAgreementTerminated(cancelInfo));
		});

		this.closeClicked();
	}

	cancelAgreement(buildType: string)
	{
		let reason = this.cancelForm.get('reason').value;
		let noteContent = this.cancelForm.get('detail').value;
		let reasonKey = Object.keys(SalesAgreementCancelReason).find(key => this.salesAgreementCancelReason[key] == reason);

		this.buildType = buildType;

		this.store.dispatch(new SalesAgreementActions.CancelSalesAgreement(buildType, noteContent, reasonKey));

		this.closeClicked();
	}

	closeClicked()
	{
		this.close.emit();
	}

	cancel()
	{
		this.closeClicked();
	}
}
