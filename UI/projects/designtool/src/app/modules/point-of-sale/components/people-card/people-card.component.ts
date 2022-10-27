import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Address, Buyer, Contact, Realtor } from 'phd-common';

type Person = 'Buyer' | 'Trust' | 'Realtor';

@Component({
	selector: 'people-card',
	templateUrl: './people-card.component.html',
	styleUrls: ['./people-card.component.scss']
})
export class PeopleCardComponent implements OnInit, OnChanges
{
	@Input() personType: Person;
	@Input() person: Buyer;
	@Input() coBuyerNA: boolean;
	@Input() trust: string;
	@Input() trustNA: boolean;
	@Input() realtor: Realtor;
	@Input() realtorNA: boolean;
	@Input() isChangingOrder: boolean = false;
	@Input() canEditAgreement: boolean = true;
	@Input() canSell: boolean = true;
	@Input() originalSignersCount: number;
	@Input() salesAgreementStatus: string;
	@Input() isLockedIn: boolean;

	@Output() onEdit = new EventEmitter<Buyer | Realtor | string>();
	@Output() onDelete = new EventEmitter<Buyer>();
	@Output() onSetAsPrimaryBuyer = new EventEmitter<Buyer>();
	@Output() onSetAsNA = new EventEmitter();
	@Output() onAddRealtor = new EventEmitter();
	@Output() onAddTrust = new EventEmitter();
	@Output() onAddCoBuyer = new EventEmitter();

	isMissingRequiredFields: boolean = false;

	constructor() { }

	get personContact()
	{
		let contact = this.person && this.person.opportunityContactAssoc && this.person.opportunityContactAssoc.contact;

		return contact || null;
	}

	ngOnInit()
	{
		this.checkForMissingRequiredFields();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		const person = changes['person'];

		// first run through Primary Buyer person is not loaded.  Once loaded we can run the required check.
		if (person && !person.firstChange)
		{
			this.checkForMissingRequiredFields();
		}
	}

	checkForMissingRequiredFields()
	{
		if (this.personType !== 'Trust')
		{
			// get the contact info which is buried for buyer
			const contact: Contact = this.personType === 'Buyer' ? this.personContact : this.realtor?.contact;

			if (contact)
			{
				// find out if we're dealing with a primary buyer
				const isPrimary = this.personType === 'Buyer' ? this.person.isPrimaryBuyer : false;

				const hasFirstName = contact.firstName?.length > 0;
				const hasLastName = contact.lastName?.length > 0;

				// find if there is an adress record
				const address: Address = contact.addressAssocs?.find(a => this.personType === 'Buyer' ? a.isPrimary : !a.isPrimary)?.address;

				// make sure everything is filled out for that address
				const hasAddress = address?.address1?.length > 0 && address?.city?.length > 0 && address?.country?.length > 0 && address?.postalCode?.length > 0 && address?.stateProvince?.length > 0;

				// Buyer = isPrimary and has a full address.  Other = not primary and no address, or not primary, has a address, and address is fully filled out
				const hasValidAddress = (isPrimary && hasAddress) || ((!isPrimary && !address) || (!isPrimary && address && hasAddress));

				const phoneAssocs = contact?.phoneAssocs;
				const phonePrimary = phoneAssocs?.find(a => a.isPrimary)?.phone;

				// phone could be any number of records but until we can do something about it lets just take the first one and run with it.
				const phoneSecondary = phoneAssocs?.find(a => !a.isPrimary)?.phone;

				const hasPhonePrimary = phonePrimary?.phoneNumber?.length > 0 && phonePrimary?.phoneType?.length > 0;

				// check to see if secondary phone is filled out, if so then phone type is now required and must be filled out as well.
				const hasPhoneSecondary = (phoneSecondary === null || phoneSecondary === undefined) || (phoneSecondary?.phoneNumber?.length > 0 && phoneSecondary?.phoneType?.length > 0);

				// check for duplicate phone numbers
				const hasDifferentPhone = hasPhonePrimary && hasPhoneSecondary ? phonePrimary.phoneNumber !== phoneSecondary?.phoneNumber : true;

				const emailPrimary = contact?.emailAssocs?.find(a => a.isPrimary)?.email;
				const emailSecondary = contact?.emailAssocs?.find(a => !a.isPrimary)?.email;
				const hasEmailPrimary = emailPrimary?.emailAddress?.length > 0;
				const hasEmailSecondary = emailSecondary?.emailAddress?.length > 0;

				// check for duplicate emails
				const hasDifferentEmail = hasEmailPrimary && hasEmailSecondary ? emailPrimary.emailAddress !== emailSecondary.emailAddress : true;

				// if something is missing then lets flag the tile as required 
				this.isMissingRequiredFields = !(hasFirstName && hasLastName && hasValidAddress && hasPhonePrimary && hasPhoneSecondary && hasEmailPrimary && hasDifferentEmail && hasDifferentPhone);
			}
		}
	}

	addTrust()
	{
		this.onAddTrust.emit();
	}

	addRealtor()
	{
		this.onAddRealtor.emit();
	}

	addCoBuyer()
	{
		this.onAddCoBuyer.emit();
	}

	edit()
	{
		switch (this.personType)
		{
			case 'Buyer':
				this.onEdit.emit(this.person);

				break;
			case 'Trust':
				this.onEdit.emit(this.trust);

				break;
			default:
				this.onEdit.emit(this.realtor);

				break;
		}
	}

	delete()
	{
		this.onDelete.emit(this.person);
	}

	setAsPrimaryBuyer()
	{
		this.onSetAsPrimaryBuyer.emit(this.person);
	}

	setAsNA()
	{
		this.onSetAsNA.emit();
	}

	canEditBuyer()
	{
		return this.canSell && (this.salesAgreementStatus === 'Pending' || this.salesAgreementStatus === 'OutforSignature'
			|| this.salesAgreementStatus === 'Signed' || this.salesAgreementStatus === 'Approved');
	}
}
