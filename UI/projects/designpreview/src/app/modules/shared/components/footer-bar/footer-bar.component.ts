import { Component, OnInit } from '@angular/core';

import { UnsubscribeOnDestroy } from 'phd-common';
import { environment } from '../../../../../environments/environment';
import { BrandService } from '../../../core/services/brand.service';

@Component({
	selector: 'footer-bar',
	templateUrl: 'footer-bar.component.html',
	styleUrls: ['footer-bar.component.scss']
})
export class FooterBarComponent extends UnsubscribeOnDestroy implements OnInit
{

	currentYear = new Date().getFullYear();
	brandUrl = '';
	accessibilityImgSrc = "assets/icon_accessibility.png";
	equalHousingImgSrc = "assets/icon_equalHousing.png";

	constructor(private brandService: BrandService) 
	{
		super();
	}

	ngOnInit()
	{
		if (environment.brandMap.americanWest === window.location.host)
		{
			this.accessibilityImgSrc = "assets/Icon_Accessibility_AmWest.svg";
			this.equalHousingImgSrc = "assets/Icon_Equal Housing_AmWest.svg";
		}

		this.brandUrl = this.brandService.getBrandHomeUrl();
	}
}
