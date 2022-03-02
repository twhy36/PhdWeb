import { Injectable } from '@angular/core';
import { Subject, Observable, ReplaySubject } from 'rxjs';

import { environment } from '../../../../environments/environment';
import * as pulte from '../../../../brands/pulte.json';
import * as delwebb from '../../../../brands/delwebb.json';

import { applyBrand, getBrandImageSrc } from 'phd-common';

@Injectable()
export class BrandService {
	environment = environment;
	brandMap = {};

	constructor() {
		this.brandMap[environment.brandMap.pulte] = (pulte as any).default;
		this.brandMap[environment.brandMap.delwebb] = (delwebb as any).default;
	}

	applyBrandStyles(): void {
		applyBrand(this.brandMap);
	}

	getBrandImage(imageProperty: string): string {
		return getBrandImageSrc(this.brandMap, imageProperty);
	}
}