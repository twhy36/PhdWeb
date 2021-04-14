import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

import { Contact, MatchingContact } from '../../../shared/models/contact.model';

@Component({
	selector: 'matching-contact-card',
	templateUrl: './matching-contact-card.component.html',
	styleUrls: ['./matching-contact-card.component.scss']
})

export class MatchingContactCardComponent implements OnInit
{
	@Input() contact: Contact | MatchingContact;
	@Input() hasExactMatch: boolean;
	@Input() defaultPrimaryAddress: boolean = true;
	@Input() contactCardType: 'Current' | 'Exact' | 'Potential' | 'Previous' | 'New';

	@Output() onSelectContact = new EventEmitter<{ contact: Contact | MatchingContact, isUpdated: boolean}>();

	contactType: string = null;
	brokerName: string = null;

	constructor() {	}

	ngOnInit()
	{
		this.contactType = this.defaultPrimaryAddress ? 'Co-Buyer' : 'Real Estate Agent';
		if (!this.defaultPrimaryAddress && this.contact.realEstateAgents && this.contact.realEstateAgents.length)
		{
			this.brokerName = this.contact.realEstateAgents[0].brokerOfficeName;
		}
	}

	getTitle() 
	{
		switch (this.contactCardType)
		{
			case 'Current':
				return 'You Entered...';
			case 'Exact':
				return 'Exact Match';
			case 'Potential':
				return 'Potential Match';
			case 'Previous':
				return 'Previous';
			case 'New':
				return 'New';
		}
	}

	selectContact(isUpdated: boolean)
	{
		this.onSelectContact.emit({ contact: this.contact, isUpdated: isUpdated });
	}
}
