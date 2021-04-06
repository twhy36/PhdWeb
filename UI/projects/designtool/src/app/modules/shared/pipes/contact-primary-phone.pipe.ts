import { Pipe, PipeTransform } from '@angular/core';
import { PhoneAssoc } from '../models/contact.model';
import { formatPhone } from '../classes/phoneUtils';

@Pipe({
	name: 'contactprimaryphone'
})
export class ContactPrimaryPhonePipe implements PipeTransform {
	transform(phones: Array<PhoneAssoc>): string {
		const primaryPhone = phones.find(p => p.isPrimary);
		return primaryPhone ? formatPhone(primaryPhone.phone.phoneNumber) : "";
	}
}
