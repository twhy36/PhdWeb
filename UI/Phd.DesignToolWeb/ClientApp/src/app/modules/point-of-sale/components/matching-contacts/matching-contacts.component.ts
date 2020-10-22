import { Component, Input } from '@angular/core';

import { Contact, MatchingContact } from '../../../shared/models/contact.model';
import { ModalContent } from '../../../shared/classes/modal.class';

@Component({
	selector: 'matching-contacts-component',
	templateUrl: './matching-contacts.component.html',
	styleUrls: ['./matching-contacts.component.scss']
})

export class MatchingContactsComponent extends ModalContent
{
	@Input() contact: Contact;
	@Input() matchingContacts: Array<MatchingContact>;

	constructor()
	{
		super();
	}

	selectContact(contact: Contact | MatchingContact)
	{
		if (contact.hasOwnProperty("isExactMatch"))
		{
			delete (contact as MatchingContact).isExactMatch;
		}

		this.close(contact as Contact);
	}

	get hasExactMatch(): boolean
	{
		return this.matchingContacts.some(c => c.isExactMatch);
	}
}
