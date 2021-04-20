import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Validators, FormBuilder, FormGroup, FormArray } from '@angular/forms';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import { cloneDeep, trim } from 'lodash'

import {
	ConfirmModalComponent, Buyer, EmailAssoc, PhoneAssoc, AddressAssoc, Address, Contact, Phone,
	MatchingContact, Realtor
} from 'phd-common';

import { ContactService } from '../../../core/services/contact.service';
import { MatchingContactsComponent } from '../matching-contacts/matching-contacts.component';
import { customEmailValidator, noWhiteSpaceValidator, phoneValidator } from '../../../shared/classes/validators';
import { stripPhoneNumber } from '../../../shared/classes/phoneUtils';
import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';
import { ModalService } from '../../../core/services/modal.service';

@Component({
	selector: 'buyer-info-detail',
	templateUrl: './buyer-info-detail.component.html',
	styleUrls: ['./buyer-info-detail.component.scss']
})
export class BuyerInfoDetailComponent extends ComponentCanNavAway implements OnInit
{
	@Input() buyer: Buyer | Realtor | string;
	@Input() salesAgreementStatus: string;
	@Input() isChangingOrder: boolean;

	@Output() onCancel = new EventEmitter();
	@Output() onSave = new EventEmitter<Buyer | Realtor | string>();

	buyerForm: FormGroup;
	trustForm: FormGroup;

	private primaryBuyer: Buyer;
	disabledInputs: boolean = false;
	isPrimaryBuyer: boolean = false;

	constructor(
		private contactService: ContactService,
		private modalService: ModalService,
		private fb: FormBuilder,
		private store: Store<fromRoot.State>)
	{
		super();
	}

	ngOnInit()
	{
		if (typeof this.buyer === "string")
		{
			this.createTrustForm(this.buyer);
		}
		else
		{
			this.createBuyerForm(this.buyer);

			const addressFormArray = this.buyerForm.get('addresses') as FormArray;
			// we are only working with the primary address for now so there will only be one Form Group
			const addressFormGroup = (addressFormArray.controls as Array<FormGroup>)[0];
			const address1Control = addressFormGroup.get("address1");
			const cityControl = addressFormGroup.get("city");

			// determine when address1 and city are required
			// - if any address field has a value then both are required
			// - if not then neither are required
			this.buyerForm.get('addresses').valueChanges.subscribe((addresses: Array<Address>) =>
			{
				// we are only working with the primary address for now which means the array of addresses will only have one element
				const address = addresses[0];

				if ((address.address1 && address.address1.length) ||
					(address.address2 && address.address2.length) ||
					(address.city && address.city.length) ||
					(address.stateProvince && address.stateProvince.length) ||
					(address.postalCode && address.postalCode.length) ||
					(address.country && address.country.length))
				{
					address1Control.setValidators([Validators.required, noWhiteSpaceValidator]);
					cityControl.setValidators([Validators.required, noWhiteSpaceValidator]);
				}
				else
				{
					address1Control.clearValidators();
					cityControl.clearValidators();
				}

				address1Control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
				cityControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
				addressFormGroup.updateValueAndValidity({ onlySelf: true, emitEvent: false });
				addressFormArray.updateValueAndValidity({ onlySelf: true, emitEvent: false });
			});
		}

		if (this.isBuyer())
		{
			this.isPrimaryBuyer = (this.buyer as Buyer).isPrimaryBuyer;

			if (!this.isPrimaryBuyer)
			{
				this.store.pipe(
					this.takeUntilDestroyed(),
					select(fromRoot.activePrimaryBuyer)
				).subscribe(primaryBuyer => this.primaryBuyer = primaryBuyer);
			}
		}

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder)
		).subscribe(changeOrder =>
		{
			this.disabledInputs = changeOrder.isChangingOrder && this.isBuyer() && (this.buyer as Buyer).id > 0;

			if (this.disabledInputs)
			{
				this.clearValidators();
			}
		});
	}

	get hasChanges()
	{
		return (this.buyerForm && this.buyerForm.dirty) || (this.trustForm && this.trustForm.dirty);
	}

	// if the buyer form is not null then disable the save button when the buyer form is invalid or no changes have been made
	// else disable the save button when the trust form is invalid
	get formIsInvalid()
	{
		return this.buyerForm ? (this.buyerForm.invalid || this.buyerForm.pristine) : this.trustForm.invalid;
	}

	canNavAway(): boolean
	{
		return !this.hasChanges;
	}

	private async showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this.modalService.open(ConfirmModalComponent);

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		return confirm.result.then((result) =>
		{
			return result === 'Continue';
		});
	}

	private async showMatchingContactsModal(contact: Contact, matchingContacts: Array<MatchingContact>): Promise<Contact>
	{
		const modal = this.modalService.open(MatchingContactsComponent, { size: "lg", windowClass: "phd-modal-window" });

		modal.componentInstance.contact = contact;
		modal.componentInstance.matchingContacts = matchingContacts;
		modal.componentInstance.defaultPrimaryAddress = !this.isRealtor();

		// modal promise will return selected contact
		// modal promise will return undefined if cancel button is clicked
		// modal promise will reject when escape key is pressed or X is clicked and return undefined
		return modal.result.then(contact => contact, rejectedReason => undefined);
	}

	isBuyer(): boolean
	{
		return this.buyer.hasOwnProperty("isPrimaryBuyer");
	}

	isRealtor(): boolean
	{
		return this.buyer.hasOwnProperty("brokerName");
	}

	isTrust(): boolean
	{
		return (typeof this.buyer === "string");
	}

	copyPrimaryBuyerAddress()
	{
		const formAddresses = this.buyerForm.get("addresses") as FormArray;
		const primaryAddressGroup = formAddresses.controls[0] as FormGroup;
		const primaryBuyerAddress = this.primaryBuyer.opportunityContactAssoc.contact.addressAssocs.find(a => a.isPrimary);

		if (primaryBuyerAddress && primaryBuyerAddress.address)
		{
			primaryAddressGroup.get("address1").setValue(primaryBuyerAddress.address.address1);
			primaryAddressGroup.get("address2").setValue(primaryBuyerAddress.address.address2);
			primaryAddressGroup.get("city").setValue(primaryBuyerAddress.address.city);
			primaryAddressGroup.get("stateProvince").setValue(primaryBuyerAddress.address.stateProvince);
			primaryAddressGroup.get("postalCode").setValue(primaryBuyerAddress.address.postalCode);
			primaryAddressGroup.get("country").setValue(primaryBuyerAddress.address.country);

			primaryAddressGroup.markAsDirty();
		}
	}

	async cancel()
	{

		const confirmMessage = `If you continue you will lose your changes.<br><br>Do you wish to continue?`;
		const confirmTitle = `Warning!`;
		const confirmDefaultOption = `Cancel`;

		if (!this.hasChanges || await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption))
		{
			this.onCancel.emit();
		}
	}

	async save()
	{
		let buyer: Buyer | Realtor | string;

		if (typeof this.buyer === "string")
		{
			buyer = trim(this.trustForm.get("trust").value);

			this.onSave.emit(buyer);
		}
		else
		{
			buyer = cloneDeep(this.buyer);

			let contact: Contact;

			if (this.isRealtor())
			{
				const brokerName = trim(this.buyerForm.get("brokerName").value);
				(buyer as Realtor).brokerName = brokerName;
				contact = (buyer as Realtor).contact;

				if (contact.realEstateAgents && contact.realEstateAgents.length)
				{
					contact.realEstateAgents[0].brokerOfficeName = brokerName;
				}
				else
				{
					contact.realEstateAgents = [{
						id: 0,
						brokerOfficeName: brokerName
					}];					
				}
			}
			else
			{
				contact = (buyer as Buyer).opportunityContactAssoc.contact;
			}

			contact.prefix = this.buyerForm.get("prefix").value;
			contact.firstName = trim(this.buyerForm.get("firstName").value);
			contact.middleName = trim(this.buyerForm.get("middleName").value);
			contact.lastName = trim(this.buyerForm.get("lastName").value);
			contact.suffix = this.buyerForm.get("suffix").value;

			const formAddresses = this.buyerForm.get("addresses") as FormArray;
			const primaryAddressGroup = formAddresses.controls[0] as FormGroup;
			const primaryAddressAssocId = primaryAddressGroup.get("id").value as number;

			// add/update buyer address
			let contactAddress = contact.addressAssocs.find(a => a.id === primaryAddressAssocId);

			if (contactAddress)
			{
				// only update the address if the address fields are not empty
				if (primaryAddressGroup.get("address1").value && (primaryAddressGroup.get("address1").value as string).length)
				{
					contactAddress.address.address1 = trim(primaryAddressGroup.get("address1").value);
					contactAddress.address.address2 = trim(primaryAddressGroup.get("address2").value);
					contactAddress.address.city = trim(primaryAddressGroup.get("city").value);
					contactAddress.address.stateProvince = trim(primaryAddressGroup.get("stateProvince").value);
					contactAddress.address.postalCode = trim(primaryAddressGroup.get("postalCode").value);
					contactAddress.address.country = trim(primaryAddressGroup.get("country").value);
				}
				else
				{
					// remove the address
					const addressIndex = contact.addressAssocs.indexOf(contactAddress);

					contact.addressAssocs.splice(addressIndex, 1);
				}
			}
			else
			{
				// only add address if the address fields are not empty
				if (primaryAddressGroup.get("address1").value && (primaryAddressGroup.get("address1").value as string).length)
				{
					let newAddressAssoc: AddressAssoc = {
						id: 0,
						doNotContact: false,
						isPrimary: this.isRealtor() ? false : true,
						address: {
							id: 0,
							address1: trim(primaryAddressGroup.get("address1").value),
							address2: trim(primaryAddressGroup.get("address2").value),
							city: trim(primaryAddressGroup.get("city").value),
							stateProvince: trim(primaryAddressGroup.get("stateProvince").value),
							postalCode: trim(primaryAddressGroup.get("postalCode").value),
							country: trim(primaryAddressGroup.get("country").value),
							county: null
						}
					};

					contact.addressAssocs.push(newAddressAssoc);
				}
			}

			const formPhones = this.buyerForm.get("phones") as FormArray;

			for (var i = 0; i < formPhones.controls.length; i++)
			{
				const phone = formPhones.controls[i] as FormGroup;
				const phoneAssocId = phone.get("id").value as number;
				const phoneNumber = stripPhoneNumber(phone.get("phoneNumber").value as string);

				if (phoneNumber && phoneNumber.length)
				{
					let contactPhone = contact.phoneAssocs.find(p => phoneAssocId !== 0 && p.id === phoneAssocId);

					if (contactPhone)
					{
						contactPhone.phone.phoneExt = trim(phone.get("phoneExt").value);
						contactPhone.phone.phoneNumber = phoneNumber;
						contactPhone.phone.phoneType = phone.get("phoneType").value;
					}
					else
					{
						let newPhoneAssoc: PhoneAssoc = {
							id: 0,
							doNotContact: false,
							isPrimary: i === 0,
							phone: {
								id: 0,
								phoneExt: trim(phone.get("phoneExt").value),
								phoneNumber: phoneNumber,
								phoneType: phone.get("phoneType").value
							}
						}

						contact.phoneAssocs.push(newPhoneAssoc);
					}
				}
				else
				{
					if (phoneAssocId)
					{
						// remove the association
						const phoneIndex = contact.phoneAssocs.findIndex(p => p.id === phoneAssocId);

						contact.phoneAssocs.splice(phoneIndex, 1);
					}
				}
			}

			const formEmails = this.buyerForm.get("emails") as FormArray;

			for (var i = 0; i < formEmails.controls.length; i++)
			{
				const email = formEmails.controls[i] as FormGroup;
				const emailAddress = email.get("emailAddress").value as string;
				const emailAssocId = email.get("id").value as number;

				if (emailAddress && emailAddress.length)
				{
					let contactEmail = contact.emailAssocs.find(p => emailAssocId !== 0 && p.id === emailAssocId);

					if (contactEmail)
					{
						contactEmail.email.emailAddress = emailAddress;
					}
					else
					{
						let newEmailAssoc: EmailAssoc = {
							id: 0,
							doNotContact: false,
							isPrimary: i === 0,
							email: {
								id: 0,
								emailAddress: emailAddress
							}
						}

						contact.emailAssocs.push(newEmailAssoc);
					}
				}
				else
				{
					if (emailAssocId)
					{
						// remove the association
						const emailIndex = contact.emailAssocs.findIndex(e => e.id === emailAssocId);

						contact.emailAssocs.splice(emailIndex, 1);
					}
				}
			}

			// check for matching contacts
			if (contact.id === 0)
			{
				const primaryPhone = contact.phoneAssocs && contact.phoneAssocs.length ? contact.phoneAssocs[0].phone.phoneNumber : '';
				const secondaryPhone = contact.phoneAssocs && contact.phoneAssocs.length > 1 ? contact.phoneAssocs[1].phone.phoneNumber : '';
				const primaryEmail = contact.emailAssocs && contact.emailAssocs.length ? contact.emailAssocs[0].email.emailAddress : '';
				const secondaryEmail = contact.emailAssocs && contact.emailAssocs.length > 1 ? contact.emailAssocs[1].email.emailAddress : '';

				this.contactService.getMatchingContacts(contact.firstName, primaryPhone, secondaryPhone, primaryEmail, secondaryEmail, this.isRealtor())
					.subscribe(async matchingContacts =>
					{
						let modalCancelled = false;

						if (matchingContacts.length)
						{
							// display matching contacts
							const selectedContact = await this.showMatchingContactsModal(contact, matchingContacts);

							// selectedContact will by empty if modal was cancelled
							modalCancelled = !selectedContact;

							// if selected contact id is not zero then replace contact with selected contact
							if (selectedContact && selectedContact.id)
							{
								if (this.isRealtor())
								{
									(buyer as Realtor).contact = selectedContact;
									(buyer as Realtor).brokerName = selectedContact.realEstateAgents && selectedContact.realEstateAgents.length 
											? selectedContact.realEstateAgents[0].brokerOfficeName
											: '';
								}
								else
								{
									(buyer as Buyer).opportunityContactAssoc.contact = selectedContact;
									(buyer as Buyer).opportunityContactAssoc.contactId = selectedContact.id;
								}
							}
						}

						if (!modalCancelled)
						{
							this.onSave.emit(buyer);
						}
					});
			}
			else
			{
				this.onSave.emit(buyer);
			}
		}
	}

	private createBuyerForm(buyer: Buyer | Realtor)
	{
		let contact: Contact;

		if (this.isRealtor())
		{
			contact = (buyer as Realtor).contact;
		}
		else
		{
			contact = (buyer as Buyer).opportunityContactAssoc.contact;
		}

		this.buyerForm = this.fb.group({
			prefix: [contact.prefix],
			firstName: [{ value: contact.firstName, disabled: this.disableBuyerNameInput() }, Validators.compose([Validators.required, noWhiteSpaceValidator])],
			middleName: [{ value: contact.middleName, disabled: this.disableBuyerNameInput() }],
			lastName: [{ value: contact.lastName, disabled: this.disableBuyerNameInput() }, Validators.compose([Validators.required, noWhiteSpaceValidator])],
			suffix: [{ value: contact.suffix, disabled: this.disableBuyerNameInput() }],
			addresses: this.createAddressesFormArray(contact.addressAssocs),
			phones: this.createPhonesFormArray(contact.phoneAssocs),
			emails: this.createEmailsFormArray(contact.emailAssocs)
		});

		if (this.isRealtor())
		{
			this.buyerForm.addControl('brokerName', this.fb.control((buyer as Realtor).brokerName, Validators.compose([noWhiteSpaceValidator])));
		}

		this.buyerForm.validator = Validators.compose([this.validateEmails, this.validatePhones]);
	}

	private disableBuyerNameInput()
	{
		return this.isChangingOrder || this.isRealtor() ? false : this.salesAgreementStatus !== 'Pending';
	}

	private createTrustForm(trust: string)
	{
		this.trustForm = this.fb.group({
			trust: [trust, Validators.compose([Validators.required, noWhiteSpaceValidator])]
		});
	}

	private createAddressesFormArray(addressAssocs: Array<AddressAssoc>)
	{
		let formGroupArray: Array<FormGroup> = [];

		if (addressAssocs.length)
		{
			const primaryAddress = addressAssocs.find(a => this.isRealtor() ? !a.isPrimary : a.isPrimary);

			if (primaryAddress)
			{
				formGroupArray.push(this.fb.group({
					id: [primaryAddress.id],
					addressId: [primaryAddress.address.id],
					isPrimary: [primaryAddress.isPrimary],
					address1: [primaryAddress.address.address1, Validators.compose([Validators.required, noWhiteSpaceValidator, Validators.maxLength(50)])],
					address2: [primaryAddress.address.address2, Validators.compose([Validators.maxLength(50)])],
					city: [primaryAddress.address.city, Validators.compose([Validators.required, Validators.maxLength(50), noWhiteSpaceValidator])],
					stateProvince: [primaryAddress.address.stateProvince, Validators.compose([Validators.required, noWhiteSpaceValidator, Validators.maxLength(20)])],
					postalCode: [primaryAddress.address.postalCode, Validators.compose([Validators.required, noWhiteSpaceValidator, Validators.maxLength(10)])],
					country: [primaryAddress.address.country, Validators.compose([Validators.required, noWhiteSpaceValidator, Validators.maxLength(50)])]
				}));
			}
		}

		// must be no more than 1 address
		for (var i = formGroupArray.length; i < 1; i++)
		{
			formGroupArray.push(this.getEmptyAddressFormGroup());
		}

		return this.fb.array(formGroupArray);
	}

	private createPhonesFormArray(phoneAssocs: Array<PhoneAssoc>)
	{
		const formGroupArray: Array<FormGroup> = [];
		const primaryPhone = phoneAssocs.find(x => x.isPrimary);
		const secondaryPhone = phoneAssocs.find(x => !x.isPrimary);

		if (primaryPhone)
		{
			formGroupArray.push(this.fb.group({
				id: [primaryPhone.id],
				phoneId: [primaryPhone.phone.id],
				isPrimary: [primaryPhone.isPrimary],
				phoneNumber: [stripPhoneNumber(primaryPhone.phone.phoneNumber), Validators.compose(primaryPhone.isPrimary ? [Validators.required, phoneValidator] : [phoneValidator])],
				phoneExt: [primaryPhone.phone.phoneExt],
				phoneType: [primaryPhone.phone.phoneType]
			}));
		}
		else
		{
			formGroupArray.push(this.getEmptyPhoneFormGroup(true));
		}

		if (secondaryPhone)
		{
			formGroupArray.push(this.fb.group({
				id: [secondaryPhone.id],
				phoneId: [secondaryPhone.phone.id],
				isPrimary: [secondaryPhone.isPrimary],
				phoneNumber: [stripPhoneNumber(secondaryPhone.phone.phoneNumber), Validators.compose([phoneValidator])],
				phoneExt: [secondaryPhone.phone.phoneExt],
				phoneType: [secondaryPhone.phone.phoneType]
			}));
		}
		else
		{
			// must be atleast 2 phones
			for (let i = formGroupArray.length; i < 2; i++)
			{
				formGroupArray.push(this.getEmptyPhoneFormGroup(i === 0));
			}
		}

		return this.fb.array(formGroupArray);
	}

	private createEmailsFormArray(emailAssocs: Array<EmailAssoc>)
	{
		const formGroupArray: Array<FormGroup> = [];
		const primaryEmail = emailAssocs.find(x => x.isPrimary);
		const secondaryEmail = emailAssocs.find(x => !x.isPrimary);

		if (primaryEmail)
		{
			formGroupArray.push(this.fb.group({
				id: [primaryEmail.id],
				emailId: [primaryEmail.email.id],
				isPrimary: [primaryEmail.isPrimary],
				emailAddress: [primaryEmail.email.emailAddress, Validators.compose([Validators.required, customEmailValidator])]
			}));
		}
		else
		{
			formGroupArray.push(this.getEmptyEmailFormGroup(true));
		}

		if (secondaryEmail)
		{
			formGroupArray.push(this.fb.group({
				id: [secondaryEmail.id],
				emailId: [secondaryEmail.email.id],
				isPrimary: [secondaryEmail.isPrimary],
				emailAddress: [secondaryEmail.email.emailAddress, Validators.compose([Validators.required, customEmailValidator])]
			}));
		}
		else
		{
			// must be atleast 2 emails
			for (let i = formGroupArray.length; i < 2; i++)
			{
				formGroupArray.push(this.getEmptyEmailFormGroup(i === 0));
			}
		}

		return this.fb.array(formGroupArray);
	}

	private getEmptyAddressFormGroup()
	{
		let addressGroup = this.fb.group({
			id: [0],
			addressId: [0],
			isPrimary: [true],
			address2: [null]
		});

		if ((this.buyer as Buyer).isPrimaryBuyer)
		{
			addressGroup.addControl("address1", this.fb.control('', Validators.compose([Validators.required, noWhiteSpaceValidator])));
			addressGroup.addControl("city", this.fb.control(null, Validators.compose([Validators.required, noWhiteSpaceValidator])));
			addressGroup.addControl("stateProvince", this.fb.control(null, Validators.compose([Validators.required, noWhiteSpaceValidator])));
			addressGroup.addControl("postalCode", this.fb.control(null, Validators.compose([Validators.required, noWhiteSpaceValidator])));
			addressGroup.addControl("country", this.fb.control(null, Validators.compose([Validators.required, noWhiteSpaceValidator])));
		}
		else
		{
			addressGroup.addControl("address1", this.fb.control(''));
			addressGroup.addControl("city", this.fb.control(null));
			addressGroup.addControl("stateProvince", this.fb.control(null));
			addressGroup.addControl("postalCode", this.fb.control(null));
			addressGroup.addControl("country", this.fb.control(null));
		}
		return addressGroup;
	}

	private getEmptyPhoneFormGroup(isPrimary: boolean = false)
	{
		let phoneGroup = this.fb.group({
			id: [0],
			phoneId: [0],
			isPrimary: [isPrimary],
			phoneExt: [null]
		});

		if (isPrimary)
		{
			phoneGroup.addControl("phoneNumber", this.fb.control('', Validators.compose([Validators.required, phoneValidator])));
			phoneGroup.addControl("phoneType", this.fb.control(null));
		}
		else
		{
			phoneGroup.addControl("phoneNumber", this.fb.control(null, phoneValidator));
			phoneGroup.addControl("phoneType", this.fb.control(null));
		}

		return phoneGroup;
	}

	private getEmptyEmailFormGroup(isPrimary: boolean = false)
	{
		let emailGroup = this.fb.group({
			id: [0],
			emailId: [0],
			isPrimary: [isPrimary]
		});

		if (isPrimary)
		{
			emailGroup.addControl("emailAddress", this.fb.control('', Validators.compose([Validators.required, customEmailValidator])));
		}
		else
		{
			emailGroup.addControl("emailAddress", this.fb.control(null, Validators.compose([customEmailValidator])));
		}

		return emailGroup;
	}

	private clearValidators()
	{
		const addressFormArray = this.buyerForm.get('addresses') as FormArray;
		const addressFormGroup = (addressFormArray.controls as Array<FormGroup>)[0];
		const address1Control = addressFormGroup.get("address1");
		if (address1Control) {
			address1Control.clearValidators();
		}
		const cityControl = addressFormGroup.get("city");
		if (cityControl) {
			cityControl.clearValidators();
		}
		const stateProvinceControl = addressFormGroup.get("stateProvince");
		if (stateProvinceControl) {
			stateProvinceControl.clearValidators();
		}
		const postalCodeControl = addressFormGroup.get("postalCode");
		if (postalCodeControl) {
			postalCodeControl.clearValidators();
		}
		const countryControl = addressFormGroup.get("country");
		if (countryControl) {
			countryControl.clearValidators();
		}

		const emailFormArray = this.buyerForm.get('emails') as FormArray;
		const emailFormGroup = (emailFormArray.controls as Array<FormGroup>)[0];
		const primaryEmailAddressControl = emailFormGroup.get("emailAddress");

		if (primaryEmailAddressControl)
		{
			primaryEmailAddressControl.clearValidators();
		}

		const phoneFormArray = this.buyerForm.get('phones') as FormArray;
		const phoneFormGroup = (phoneFormArray.controls as Array<FormGroup>)[0];
		const primaryPhoneNumberControl = phoneFormGroup.get("phoneNumber");

		if (primaryPhoneNumberControl)
		{
			primaryPhoneNumberControl.clearValidators();
		}

		const primaryPhoneTypeControl = phoneFormGroup.get("phoneType");

		if (primaryPhoneTypeControl)
		{
			primaryPhoneTypeControl.clearValidators();
		}
	}

	private validateEmails(formGroup: FormGroup): { [key: string]: boolean }
	{
		const emailFormArray = formGroup.controls['emails'] as FormArray;

		const primaryEmailFormGroup = (emailFormArray.controls as Array<FormGroup>)[0];
		const primaryEmail = primaryEmailFormGroup.value.emailAddress || '';

		const secondaryEmailFormGroup = (emailFormArray.controls as Array<FormGroup>)[1];
		const secondaryEmail = secondaryEmailFormGroup.value.emailAddress || '';

		if (primaryEmail && primaryEmail === secondaryEmail)
		{
			return {
				duplicateEmails: true
			};
		}

		return null;
	}

	private validatePhones(formGroup: FormGroup): { [key: string]: boolean }
	{
		const phoneFormArray = formGroup.controls['phones'] as FormArray;

		const primaryPhoneFormGroup = (phoneFormArray.controls as Array<FormGroup>)[0];
		const primaryPhone = primaryPhoneFormGroup.value.phoneNumber || '';
		const primaryPhoneExt = primaryPhoneFormGroup.value.phoneExt || '';

		const secondaryPhoneFormGroup = (phoneFormArray.controls as Array<FormGroup>)[1];
		const secondaryPhone = secondaryPhoneFormGroup.value.phoneNumber || '';
		const secondaryPhoneExt = secondaryPhoneFormGroup.value.phoneExt || '';

		if (primaryPhone && primaryPhone === secondaryPhone && primaryPhoneExt === secondaryPhoneExt)
		{
			return {
				duplicatePhones: true
			};
		}

		return null;
	}
}
