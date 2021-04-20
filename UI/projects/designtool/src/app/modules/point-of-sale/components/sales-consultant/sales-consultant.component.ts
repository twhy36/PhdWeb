import { Component, OnInit, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray, AbstractControl, ValidatorFn } from '@angular/forms';

import { Store, select } from '@ngrx/store';
import {  Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromOrg from '../../../ngrx-store/org/reducer';
import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';

import { UnsubscribeOnDestroy, Contact, Consultant, SalesAgreement } from 'phd-common';

import { ContactService } from '../../../core/services/contact.service';

import { AutoComplete } from 'primeng/autocomplete';

@Component({
	selector: 'sales-consultant',
	templateUrl: './sales-consultant.component.html',
	styleUrls: ['./sales-consultant.component.scss']
})
export class SalesConsultantComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(AutoComplete) ac: AutoComplete;

	@Input() consultants: Consultant[];
	@Input() salesAgreement: SalesAgreement;
	@Input() canEdit: boolean;

	@Output() close = new EventEmitter<void>();

	isSaving: boolean = false;
	consultantForm: FormGroup;

	consultantSearchResultsList: Contact[] = [];
	searchText: string = '';
	isSearching: number = -1;
	marketNumber: string = '';

	search$: Subject<string>;

	constructor(private store: Store<fromRoot.State>, private _contactService: ContactService) {
		super();
		this.search$ = new Subject<string>();
	}

	get canSave(): boolean
	{
		let canSave = this.consultantForm.pristine || !this.consultantForm.valid;

		return canSave;
	}

	get disableButtons()
	{
		return this.canSave;
	}

	get showPlus(): boolean
	{
		return this.contactsArray.controls.length < 4;
	}

	get contactsArray(): FormArray
	{
		return this.consultantForm.get('contacts') as FormArray;
	}

	get showVolumeTotalMsg(): boolean
	{
		const consultantForm = this.consultantForm;

		return consultantForm.invalid && (consultantForm.dirty || consultantForm.touched) && (!!consultantForm.errors && consultantForm.errors.notValidPercent)
	}

	getLabel(index: number): string
	{
		let val = index + 1;
		let nth = (n: number) => { return ['st', 'nd', 'rd'][((n + 90) % 100 - 10) % 10 - 1] || 'th' }; //ordinal suffixes

		return val == 1 ? 'Primary' : `${val}${nth(index+1)}`;
	}
	
	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromOrg.market)
		).subscribe(market => this.marketNumber = !!market ? market.number : '' );

		this.search$.pipe(
			switchMap(filterText => {
				return this._contactService.getSalesConsultantsByRoles(this.marketNumber, filterText);
			})
		).subscribe(data => {
			this.consultantSearchResultsList = data.map(sc => new ContactSC(sc));
			this.isSearching = -1;
		});

		this.createForm();
	}

	createForm()
	{
		this.consultantForm = new FormGroup({
			'contacts': new FormArray([])
		}, this.percentTotalValidator());

		if (this.consultants.length > 0)
		{
			this.consultants.forEach(con =>
			{				
				this.createContact(con.contact, con.commission);
			});
		}
		else
		{
			this.createContact(null, 0);
		}
	}

	createContact(contact: Contact, commission: number)
	{
		const conArray = this.consultantForm.get('contacts') as FormArray;
		let newContact = contact ? new ContactSC(contact) : null;
		
		const fg = new FormGroup({
			'contact': new FormControl(newContact, [Validators.required, this.contactValidator()]),
			'commission': new FormControl(commission, [Validators.required, Validators.min(0), Validators.max(1), this.numberValidator()])
		});

		conArray.push(fg);
	}

	contactValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			const consultant = control.value;

			if (consultant)
			{
				let form = this.consultantForm.get('contacts') as FormArray;

				// check the current array for any duplicates
				let data = form.controls.some(x => x.value && x.value.contact && x.value.contact.id == consultant.id && x.value.contact != consultant);

				return data ? { alreadyExist: true } : null;
			}
			else
			{
				return { invalidContact: true };
			}
		};
	}

	numberValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			const val: string = control.value;

			// allow only positive.  
			const exp = new RegExp(/^\s*(?=.*[0-9])\d*(?:\.\d{1,2})?\s*$/);
			let isValid = val ? exp.test(val) : true;

			return isValid ? null : { numberValidator: true }
		};
	}

	percentTotalValidator(): ValidatorFn
	{
		return (form: AbstractControl): { [key: string]: any } =>
		{
			let sum = 0;
			let formArray = form.get('contacts') as FormArray;

			formArray.controls.forEach(x =>
			{
				sum += x.value && x.value.commission ? x.value.commission : 0;
			});

			let result = sum != 1 ? { 'notValidPercent': true } : null;

			return result;
		};
	}

	addConsultant()
	{
		this.createContact(null, 0);

		this.consultantForm.get('contacts').markAsDirty();
	}

	removeConsultant(index: number)
	{
		const conArray = this.consultantForm.get('contacts') as FormArray;

		conArray.removeAt(index);
		conArray.markAsDirty();
		conArray.controls.forEach(x => x.markAsTouched());
	}
	
	closeClicked()
	{
		this.close.emit();
	}

	save()
	{
		const conArray = this.consultantForm.get('contacts') as FormArray;
		let isPrimary = true;

		const consultants = conArray.controls.map(c =>
		{
			let consultant = new Consultant();

			consultant.id = 0;
			consultant.commission = c.get('commission').value;
			consultant.contact = c.get('contact').value;
			consultant.isPrimary = isPrimary;

			isPrimary = false;

			return consultant;
		});

		this.store.dispatch(new SalesAgreementActions.SaveSalesConsultants(consultants));

		this.closeClicked();
	}

	cancel()
	{
		this.closeClicked();
	}

	findContact(event: any, index: number)
	{
		this.isSearching = index;
		this.search$.next(event.query);
	}
}

class ContactSC extends Contact
{
	get fullName()
	{
		return this.lastName || this.firstName ? `${this.lastName}, ${this.firstName}` : '';
	}
}
