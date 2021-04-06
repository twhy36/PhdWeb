import { Component, Input } from '@angular/core';

import { EmailAssoc, PhoneAssoc } from '../../../shared/models/contact.model';
import { formatPhone } from '../../../shared/classes/phoneUtils';

@Component({
	selector: 'contact-item',
	templateUrl: './contact-item.component.html',
	styleUrls: ['./contact-item.component.scss']
})

export class ContactItemComponent
{
	@Input() contactItems: Array<EmailAssoc> | Array<PhoneAssoc>;
	@Input() isPrimary: boolean;
	@Input() itemType: 'Email' | 'Phone';

	constructor() {	}

	getContent() : string
	{
		let content = '';
		if (this.contactItems)
		{
			if (this.itemType === 'Email')
			{
				const emails = this.contactItems as Array<EmailAssoc>;
				if (emails)
				{
					const filteredEmails = emails.filter(x => x.isPrimary === this.isPrimary);
					if (filteredEmails && filteredEmails.length > 0)
					{
						content = filteredEmails[0].email.emailAddress;
					}
				}
			}
			else if (this.itemType === 'Phone')
			{
				const phones = this.contactItems as Array<PhoneAssoc>;
				if (phones)
				{
					const filteredPhones = phones.filter(x => x.isPrimary === this.isPrimary);
					if (filteredPhones && filteredPhones.length > 0)
					{
						content = formatPhone(filteredPhones[0].phone.phoneNumber);
					}
				}
			}
		}
		return content;
	}
}
