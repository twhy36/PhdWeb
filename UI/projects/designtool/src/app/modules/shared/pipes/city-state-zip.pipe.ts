import { Pipe, PipeTransform } from '@angular/core';
import { Address } from 'phd-common';

@Pipe({
	name: 'citystatezip'
})
export class CityStateZipPipe implements PipeTransform {
	transform(address: Address): string {
		return this.concatCityStateZip(address);
	}

	private concatCityStateZip(address: Address): string {
		let cityStateZip = "";
		if (address.city && address.city.length) {
			cityStateZip += address.city;
		}
		if (address.stateProvince && address.stateProvince.length) {
			cityStateZip += cityStateZip.length ? `, ${address.stateProvince}` : address.stateProvince;
		}
		if (address.postalCode && address.postalCode.length) {
			cityStateZip += cityStateZip.length ? ` ${address.postalCode}` : address.postalCode;
		}
		return cityStateZip;
	}
}
