import { Component, OnInit, EventEmitter, Output, Inject } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';

import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';

import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';

import { SalesAgreementCancelReason } from '../../../shared/models/sales-agreement.model';
import { SalesAgreementService } from '../../../core/services/sales-agreement.service';
import { Note, NoteAssoc } from '../../../shared/models/note.model';

@Component({
	selector: 'cancel-agreement',
	templateUrl: './cancel-agreement.component.html',
	styleUrls: ['./cancel-agreement.component.scss']
})
export class CancelAgreementComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Output() close = new EventEmitter<void>();

	cancelForm: FormGroup;
	cancelDate: Date = new Date();
	constructionStageName: string;

	salesAgreementCancelReason = SalesAgreementCancelReason;
	salesAgreementId: number;

	buildType: string;

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

		this.createForm();
	}

	createForm()
	{
		this.cancelForm = new FormGroup({
			'reason': new FormControl(null, Validators.required),
			'detail': new FormControl('')
		});
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
