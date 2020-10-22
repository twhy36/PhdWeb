import { Pipe, PipeTransform } from '@angular/core';
import { EmailAssoc } from '../models/contact.model';

@Pipe({
	name: 'contactprimaryemail'
})
export class ContactPrimaryEmailPipe implements PipeTransform {
	transform(emails: Array<EmailAssoc>): string {
		const primaryEmail = emails.find(e => e.isPrimary);
		return primaryEmail ? primaryEmail.email.emailAddress : "";
	}
}
