import { Pipe, PipeTransform } from '@angular/core';
import { AddressAssoc, Address } from 'phd-common';

@Pipe({
	name: 'contactaddress'
})
export class ContactAddressPipe implements PipeTransform {
	transform(addresses: Array<AddressAssoc>, isPrimary: boolean): Address {
		const address = addresses.find(e => e.isPrimary === isPrimary);
		return address ? address.address : null;
	}
}
