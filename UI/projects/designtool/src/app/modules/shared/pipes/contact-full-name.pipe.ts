import { Pipe, PipeTransform } from '@angular/core';
import { Contact } from 'phd-common';

@Pipe({
	name: 'contactfullname'
})
export class ContactFullNamePipe implements PipeTransform
{
	transform(contact: Contact): string
	{
		return this.concatFullName(contact);
	}

	private concatFullName(contact: Contact): string
	{
		let fullNameArray = [];

		if (contact)
		{
			fullNameArray.push(contact.prefix || '');
			fullNameArray.push(contact.firstName || '');
			fullNameArray.push(contact.middleName || '');
			fullNameArray.push(contact.lastName || '');
			fullNameArray.push(contact.suffix || '');
		}

		return fullNameArray.filter(x => !!x.trim()).join(' ');
	}
}
