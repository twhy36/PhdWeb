import { Component, OnInit, Input, HostListener, EventEmitter, Output } from '@angular/core';
import { FormGroup, FormArray, FormControl, Validators, ValidatorFn, AbstractControl } from '@angular/forms';

import { Observable, of } from 'rxjs';
import { mergeMap, switchMap } from 'rxjs/operators';

import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';

import { ESignField } from '../../../shared/models/eSignFields.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { ContractService } from '../../../core/services/contract.service';
import { MessageService } from 'primeng/api';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { CanComponentDeactivate } from 'phd-common';

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

	constructor(
		private _orgService: OrganizationService,
		private _contractService: ContractService,
		private _msgService: MessageService
	)
	{
		super();
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
	}

	createForm()
	{
		let agentName = this.existingSignField ? this.existingSignField.authorizedAgentFullName : null;
		let emailAddress = this.existingSignField ? this.existingSignField.authorizedAgentEmail : null;
		let expirationDays = this.existingSignField ? this.existingSignField.expirationDays : null;
		let expirationWarnDays = this.existingSignField ? this.existingSignField.expirationWarnDays : null;
		let reminderDays = this.existingSignField ? this.existingSignField.reminderDays : null;
		let repeatReminderDays = this.existingSignField ? this.existingSignField.repeatReminderDays : null;
		let defaultEmailForSignedCopies = this.existingSignField && this.existingSignField.defaultEmailForSignedCopies ? this.existingSignField.defaultEmailForSignedCopies.split(';') : null;

		this.signFieldForm = new FormGroup({
			'agentName': new FormControl({ value: agentName, disabled: !this.canEdit }),
			'emailAddress': new FormControl({ value: emailAddress, disabled: !this.canEdit }, Validators.email),
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
				const signField = this.signFieldForm.value as ESignField;

				signField.orgId = data.orgID;
				signField.defaultEmailForSignedCopies = (<FormArray>this.signFieldForm.get('defaultEmailForSignedCopies')).controls.map(c => c.value).join(';');

				// Set the EDH properties
				signField.id = this.existingSignField ? this.existingSignField.id : 0; // ContactFinancialCommunityAuthorizedAgentAssocId
				signField.financialCommunityId = this.selectedCommunity.id;

				return !this.existingSignField.orgId ? this._contractService.saveESignField(signField) : this._contractService.updateESignField(signField);
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
}
