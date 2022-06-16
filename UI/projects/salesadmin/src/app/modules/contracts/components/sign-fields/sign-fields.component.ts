import { Component, OnInit, Input, HostListener, EventEmitter, Output } from '@angular/core';
import { FormGroup, FormArray, FormControl, Validators, ValidatorFn, AbstractControl } from '@angular/forms';

import { forkJoin, Observable, of, Subject } from 'rxjs';
import { flatMap, mergeMap, switchMap } from 'rxjs/operators';

import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';

import { ESignField } from '../../../shared/models/eSignFields.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { ContractService } from '../../../core/services/contract.service';
import { MessageService } from 'primeng/api';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { CanComponentDeactivate, Contact } from 'phd-common';
import { ContactService } from '../../../core/services/contact.service';

@Component({
	selector: 'sign-fields',
	templateUrl: './sign-fields.component.html',
	styleUrls: ['./sign-fields.component.scss']
})
export class SignFieldsComponent extends UnsubscribeOnDestroy implements OnInit, CanComponentDeactivate
{
	@Input() existingSignField: ESignField = null;
	@Input() currentMkt: FinancialMarket = null;
	@Input() selectedCommunity: FinancialCommunity = null;
	@Input() canEdit: boolean = false;

	@Output() signFieldSaved = new EventEmitter<object>();

	signFieldForm: FormGroup;

	employeeContactSearchResultsList: EmployeeContact[] = [];
	searchEmployeeContact$: Subject<string>;

	constructor(
		private _orgService: OrganizationService,
		private _contractService: ContractService,
		private _msgService: MessageService,
		private _contactService: ContactService
	)
	{
		super();
		this.searchEmployeeContact$ = new Subject<string>();
	}

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return !this.signFieldForm.dirty;
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = true;

		if (!this.signFieldForm.pristine && !this.signFieldForm.invalid)
		{
			saveDisabled = false;
		}

		return saveDisabled;
	}

	ngOnInit(): void
	{
		this.createForm();

		this.searchEmployeeContact$.pipe(
			switchMap(filterText =>
			{
				return this._contactService.getEmployeeContactsWithName(filterText);
			})
		).subscribe(data =>
		{
			this.employeeContactSearchResultsList = data.map(sc => new EmployeeContact(sc));
		});
	}

	createForm()
	{
		let authorizedAgent = this.existingSignField ? {
			id: this.existingSignField.contactId,
			fullName: this.existingSignField.authorizedAgentFullName,
			emailAddress: this.existingSignField.authorizedAgentEmail
		} as EmployeeContact : null;
		let authorizedAgentEmail = authorizedAgent ? authorizedAgent.emailAddress : null;
		let expirationDays = this.existingSignField ? this.existingSignField.expirationDays : null;
		let expirationWarnDays = this.existingSignField ? this.existingSignField.expirationWarnDays : null;
		let reminderDays = this.existingSignField ? this.existingSignField.reminderDays : null;
		let repeatReminderDays = this.existingSignField ? this.existingSignField.repeatReminderDays : null;
		let defaultEmailForSignedCopies = this.existingSignField && this.existingSignField.defaultEmailForSignedCopies ? this.existingSignField.defaultEmailForSignedCopies.split(';') : null;

		this.signFieldForm = new FormGroup({
			'authorizedAgent': new FormControl({ value: authorizedAgent, disabled: !this.canEdit }),
			'authorizedAgentEmail': new FormControl({ value: authorizedAgentEmail, disabled: true }, Validators.email), // #362302 read-only
			'expirationDays': new FormControl({ value: expirationDays, disabled: !this.canEdit }, [Validators.max(999)]),
			'expirationWarnDays': new FormControl({ value: expirationWarnDays, disabled: !this.canEdit }, [Validators.max(999), this.expireValidator()]),
			'reminderDays': new FormControl({ value: reminderDays, disabled: !this.canEdit }, Validators.max(999)),
			'repeatReminderDays': new FormControl({ value: repeatReminderDays, disabled: !this.canEdit }, Validators.max(999)),
			'defaultEmailForSignedCopies': new FormArray([])
		});

		const signedCopiesArray = this.signFieldForm.get("defaultEmailForSignedCopies") as FormArray;

		if (defaultEmailForSignedCopies?.length)
		{
			defaultEmailForSignedCopies.forEach(sc => signedCopiesArray.push(new FormControl({ value: sc, disabled: !this.canEdit }, [this.emailValidator()])));
		}
		else
		{
			signedCopiesArray.push(new FormControl({ value: null, disabled: !this.canEdit }, [this.emailValidator()]));
		}

		this.signFieldForm.get('expirationDays').valueChanges.subscribe(val =>
		{
			this.signFieldForm.get('expirationWarnDays').updateValueAndValidity({ onlySelf: true });
		});
	}

	expireChecked: boolean = false;

	emailValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			// handle empty email field
			return !control.value ? null : Validators.email(control);
		}
	}

	expireValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			const expirationWarnDays = control;
			const expirationDays = this.signFieldForm ? this.signFieldForm.get('expirationDays') : null;

			// warning can't be greater than expiration days
			let isValid = (expirationDays && expirationDays.valid != null) && (expirationWarnDays && expirationWarnDays.value != null) ? expirationWarnDays.value < expirationDays.value : true;

			return isValid ? null : { expireValidator: true };
		};
	}

	checkIfNumber(event: any)
	{
		var charCode = event.which ? event.which : event.keyCode;

		if (charCode > 31 && (charCode < 48 || charCode > 57))
		{
			return false;
		}

		return true;
	}

	addInput()
	{
		(<FormArray>this.signFieldForm.get('defaultEmailForSignedCopies')).push(new FormControl('', Validators.email));
		this.signFieldForm.markAsDirty();
	}

	deleteInput(index: number)
	{
		(<FormArray>this.signFieldForm.get('defaultEmailForSignedCopies')).removeAt(index);
		this.signFieldForm.markAsDirty();
	}

	saveSignField()
	{
		this._orgService.getInternalOrgs(this.currentMkt.id).pipe(
			mergeMap(internalOrgs =>
			{
				let org = internalOrgs.find(o => (o.edhMarketId === this.currentMkt.id && o.edhFinancialCommunityId === this.selectedCommunity.id));

				return org ? of(org) : this._orgService.createInternalOrg(this.selectedCommunity);
			}),
			switchMap(data =>
			{
				// Get all fields from the form
				const fullSignField = this.signFieldForm.value;

				// Remove the authorizedAgent field since it is not on the ESignField class
				const { authorizedAgent, ...remaining } = fullSignField;

				const signField = remaining as ESignField;

				signField.orgId = data.orgID;
				signField.defaultEmailForSignedCopies = (<FormArray>this.signFieldForm.get('defaultEmailForSignedCopies')).controls.map(c => c.value).join(';');

				// Set the EDH properties
				signField.id = this.existingSignField ? this.existingSignField.id : 0; // ContactFinancialCommunityAuthorizedAgentAssocId
				signField.contactId = authorizedAgent.id;
				signField.financialCommunityId = this.selectedCommunity.id;
				signField.authorizedAgentFullName = authorizedAgent.fullName;
				signField.authorizedAgentEmail = authorizedAgent.emailAddress;

				return this.existingSignField === null ? this._contractService.saveESignField(signField) : this._contractService.updateESignField(signField);
			})
		).subscribe((eSignData) =>
		{
			this.signFieldForm.markAsPristine();
			this.signFieldSaved.emit(eSignData);
			this._msgService.add({ severity: 'success', summary: 'Sign Field', detail: `has been saved!` });
		},
			(error) =>
			{
				this._msgService.add({ severity: 'error', summary: 'Error saving Sign Field' });
			})
	}

	findContact(event: any)
	{
		this.searchEmployeeContact$.next(event.query);
	}

	onSelectContact(event: EmployeeContact)
	{
		// Update the email address field
		if (event.emailAddress)
		{
			this.signFieldForm.patchValue({ 'authorizedAgentEmail': event.emailAddress });
		}
	}
}

class EmployeeContact
{
	id: number;
	fullName: string;
	emailAddress: string;
	jobTitle: string;

	constructor(dto: Contact = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.fullName = `${dto.firstName} ${dto.lastName}`;
			this.emailAddress = dto.emailAssocs[0]?.email.emailAddress;
			this.jobTitle = dto.jobTitle;
		}
	}

	get displayValue()
	{
		return `${this.fullName} (${this.jobTitle})`;
	}
}