import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';

import { UnsubscribeOnDestroy } from 'phd-common';
import { environment } from '../../../../../environments/environment';
import { BrandService } from '../../../core/services/brand.service';
import { BuildMode } from '../../models/build-mode.model';

import * as fromRoot from '../../../../modules/ngrx-store/reducers';

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
	isPresale: boolean = false;

	constructor(private brandService: BrandService,
		private store: Store<fromRoot.State>) 
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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
		).subscribe((state) => 
		{
			this.isPresale = state.buildMode === BuildMode.Presale
		});
	}
}
