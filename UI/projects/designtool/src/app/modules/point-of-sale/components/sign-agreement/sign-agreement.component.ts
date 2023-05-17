import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, filter, combineLatest, take } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { NgbDate } from '@ng-bootstrap/ng-bootstrap';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { NgbDateNativeAdapter } from '../../../shared/classes/ngbDatePicker/ngbDateNativeAdapter.class';
import { ModalContent } from 'phd-common';

@Component({
	selector: 'sign-agreement-component',
	templateUrl: './sign-agreement.component.html',
	styleUrls: ['./sign-agreement.component.scss']
})
export class SignAgreementComponent extends ModalContent implements OnInit
{
	buildMode$: Observable<string>;
	customerName$: Observable<string>;
	agreementDate$: Observable<Date>;
	agreementNumber$: Observable<string>;

	// Form data
	signAgreementForm: FormGroup;
	signedDate: NgbDate;
	minDate: NgbDateStruct;

	adapter: NgbDateNativeAdapter = new NgbDateNativeAdapter();

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	ngOnInit(): void
	{
		this.buildMode$ = this.store.pipe(
			select(fromScenario.buildMode));

		this.customerName$ = this.store.pipe(
			select(state => state.opportunity.opportunityContactAssoc.contact),
			combineLatest(this.buildMode$),
			map(([contact, buildMode]) => (buildMode === 'spec' || buildMode === 'model') ? buildMode : contact ? `${contact.firstName || ''} ${contact.lastName || ''} ${contact.suffix || ''}` : null),
			filter(contact => !!contact)
		);

		this.agreementNumber$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.salesAgreementNumber)
		);

		this.agreementDate$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.statusUtcDate)
		);

		this.agreementDate$.pipe(take(1)).subscribe(value =>
		{
			this.minDate = {
				year: new Date(value).getFullYear(),
				month: new Date(value).getMonth() + 1,
				day: new Date(value).getDate()
			};
		});

		this.initializeData();
		this.createForm();
	}

	private initializeData()
	{
		const currentDate = new Date();
		this.signedDate = NgbDate.from(this.adapter.fromModel(currentDate));
	}

	private createForm()
	{
		this.signAgreementForm = new FormGroup({
			'signedDate': new FormControl(this.signedDate || null, [Validators.required])
		});
	}

	signAgreement()
	{
		// get date objects from NgbDates
		const signedDate = this.adapter.toModel(this.signAgreementForm.get('signedDate').value);

		// close modal and send back signed date
		this.close(signedDate);
	}
}
