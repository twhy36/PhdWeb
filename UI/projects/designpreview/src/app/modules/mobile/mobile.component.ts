import { Component } from '@angular/core';

import { BrandService } from '../core/services/brand.service';

@Component({
	selector: 'mobile',
	templateUrl: './mobile.component.html',
	styleUrls: ['./mobile.component.scss']
	})
export class MobileComponent 
{

	constructor(private brandService: BrandService) {}

	getImageSrc(): string
	{
		return this.brandService.getBrandImage('white_logo');
	}
}
