import { Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import * as pulte from '../../../../brands/pulte.json';
import * as delwebb from '../../../../brands/delwebb.json';
import * as americanWest from '../../../../brands/americanwest.json';

import { applyBrand, getBrandImageSrc } from 'phd-common';

@Injectable()
export class BrandService {
	environment = environment;
	brandMap = {};

	constructor() {
		this.brandMap[environment.brandMap.pulte] = (pulte as any).default;
		this.brandMap[environment.brandMap.delwebb] = (delwebb as any).default;
		this.brandMap[environment.brandMap.americanWest] = (americanWest as any).default;
	}

	applyBrandStyles(): void {
		applyBrand(this.brandMap);
	}

	getBrandImage(imageProperty: string): string {
		return getBrandImageSrc(this.brandMap, imageProperty);
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