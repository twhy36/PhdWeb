import { Component, Input, ViewChild } from '@angular/core';

import { Contact, MatchingContact } from '../../../shared/models/contact.model';
import { ModalContent } from '../../../shared/classes/modal.class';
import { ModalService } from '../../../core/services/modal.service';
import { ModalRef } from '../../../shared/classes/modal.class';

@Component({
	selector: 'matching-contacts-component',
	templateUrl: './matching-contacts.component.html',
	styleUrls: ['./matching-contacts.component.scss']
})

export class MatchingContactsComponent extends ModalContent
{
	@Input() contact: Contact;
	@Input() matchingContacts: Array<MatchingContact>;
	@Input() defaultPrimaryAddress: boolean = true;

	@ViewChild('confirmation') confirmation: any;

	modalReference: ModalRef;
	previousContact: Contact;

	constructor(private modalService: ModalService)
	{
		super();
	}

	selectContact(data: { contact: Contact | MatchingContact, isUpdated: boolean })
	{
		if (data.contact.hasOwnProperty("isExactMatch"))
		{
			delete (data.contact as MatchingContact).isExactMatch;
		}

		let selectedContact = data.contact as Contact;

		if (data.isUpdated)
		{
			this.previousContact = selectedContact;
			this.modalReference = this.modalService.open(this.confirmation, { size: "lg", windowClass: "phd-modal-window" });
		}
		else
		{
			this.close(selectedContact);
		}
	}

	closeConfirmation(isContinue: boolean)
	{
		if (isContinue)
		{
			this.contact.id = this.previousContact.id;

			const addresseAssocs = this.previousContact.addressAssocs 
				? this.previousContact.addressAssocs.filter(x => x.isPrimary !== this.defaultPrimaryAddress)
				: null;
			if (addresseAssocs && addresseAssocs.length)
			{
				addresseAssocs.forEach(a => {
					this.contact.addressAssocs.push(a);
				});
			}

			this.modalReference.close();
			this.close(this.contact);
		}
		else
		{
			this.modalReference.close();
		}
	}

	get hasExactMatch(): boolean
	{
		return this.matchingContacts.some(c => c.isExactMatch);
	}
}
