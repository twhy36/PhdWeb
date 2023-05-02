import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';

import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';

import { UnsubscribeOnDestroy, Note, TargetAudienceTypeEnum, SalesAgreementCancelReason, SalesAgreement } from 'phd-common';

import { SalesAgreementService } from '../../../core/services/sales-agreement.service';
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

	cancelForm: UntypedFormGroup;
	cancelDate: Date = new Date();
	constructionStageName: string;

	salesAgreementCancelReason = SalesAgreementCancelReason;
	salesAgreementId: number;

	buildType: string;
	reasonValue: string;
	default: Note;
	jobTypeName: string;

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
		return this.constructionStageName == 'Configured' ? this.jobTypeName === 'Model' ? 'Revert To Model' : 'Revert To Spec' : 'Ok';
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
			select(store => store.job)
		).subscribe(job => {
			this.jobTypeName = job.jobTypeName
			this.constructionStageName = job.constructionStageName;
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
		this.cancelForm = new UntypedFormGroup({
			'reason': new UntypedFormControl(this.reasonValue || null, Validators.required),
			'detail': new UntypedFormControl(this.default && this.default.noteContent || '')
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
				return this._saService.createSalesAgreementCancellation(this.salesAgreementId, notes ? notes.id : null, reasonKey);
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
