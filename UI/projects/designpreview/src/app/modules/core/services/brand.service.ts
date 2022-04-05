import { Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import * as pulte from '../../../../brands/pulte.json';
import * as delwebb from '../../../../brands/delwebb.json';
import * as americanWest from '../../../../brands/americanwest.json';
import * as divosta from '../../../../brands/divosta.json';

import { applyBrand, getBrandImageSrc } from 'phd-common';

@Injectable()
export class BrandService {
	environment = environment;
	brandMap = {};

	constructor() {
		this.brandMap[environment.brandMap.pulte] = (pulte as any).default;
		this.brandMap[environment.brandMap.delwebb] = (delwebb as any).default;
		this.brandMap[environment.brandMap.americanWest] = (americanWest as any).default;
		this.brandMap[environment.brandMap.divosta] = (divosta as any).default;
		this.brandMap[environment.brandMap.johnWieland] = (pulte as any).default;	// Here for testing purposes, Replace with proper brand when ready
	}

	applyBrandStyles(): void {
		applyBrand(this.brandMap);
	}

	getBrandImage(imageProperty: string): string {
		return getBrandImageSrc(this.brandMap, imageProperty);
	}

	getBrandedLogoutUrl() {
		let baseUrl = window.location.host;
		if (environment.brandMap.pulte === baseUrl) {
			return environment.brandLogoutMap.pulte;
		} else if (environment.brandMap.delwebb === baseUrl) {
			return environment.brandLogoutMap.delwebb;
		} else if (environment.brandMap.americanWest === baseUrl) {
			return environment.brandLogoutMap.americanWest;
		} else if (environment.brandMap.divosta === baseUrl) {
			return environment.brandLogoutMap.divosta;
		} else if (environment.brandMap.johnWieland === baseUrl) {
			return environment.brandLogoutMap.johnWieland;
		}
	}

	getBrandName(brandMap: { pulte: string, delwebb: string, americanWest: string }, url: string) {
		if (brandMap.pulte === url) {
			return 'pulte';
		} else if (brandMap.delwebb === url) {
			return 'delwebb';
		} else if (brandMap.americanWest === url) {
			return 'americanWest'
		}
	}
}