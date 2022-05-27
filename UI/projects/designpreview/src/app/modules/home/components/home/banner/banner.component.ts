import { Component } from '@angular/core';

import { BrandService } from '../../../../core/services/brand.service';

@Component({
	selector: 'banner',
    templateUrl: 'banner.component.html',
    styleUrls: ['banner.component.scss']
})
export class BannerComponent
{
	constructor(private brandService: BrandService) { }

	getBannerImage(position: number) {
		return this.brandService.getBannerImage(position);
	}
}
