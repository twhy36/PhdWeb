import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';

import { ModalRef, ModalService, UnsubscribeOnDestroy } from 'phd-common';
import { environment } from '../../../../../environments/environment';
import { BrandService } from '../../../core/services/brand.service';
import { BuildMode } from '../../models/build-mode.model';

import * as fromRoot from '../../../../modules/ngrx-store/reducers';

import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { InfoDisclaimerComponent } from '../../../core/components/info-disclaimer/info-disclaimer.component';

@Component({
	selector: 'footer-bar',
	templateUrl: 'footer-bar.component.html',
	styleUrls: ['footer-bar.component.scss']
})
export class FooterBarComponent extends UnsubscribeOnDestroy implements OnInit
{

	currentYear = new Date().getFullYear();
	accessibilityImgSrc = 'assets/icon_accessibility.png';
	equalHousingImgSrc = 'assets/icon_equalHousing.png';
	disclaimerModal: ModalRef;
	isPresale: boolean = false;
	termsUrl: string;
	policyUrl: string;

	constructor(private brandService: BrandService,
		private modalService: ModalService,
		private store: Store<fromRoot.State>)
	{
		super();
	}

	ngOnInit()
	{
		//set terms and policy urls per brand per enviornments
		const brandBaseUrl = this.brandService.getBrandHomeUrl();
		const sitecorePartialUrl = '/sitecore/content/pulte/pulte-home-page';
		
		switch (window.location.host)
		{
		case environment.brandMap.americanWest:

			//Terms/Policy links: use /sitecore URLs in lower enviornments, and /legal URL for production
			this.termsUrl = brandBaseUrl + (environment.production ? '/legal' : sitecorePartialUrl) + '/terms-of-use/';
			this.policyUrl = brandBaseUrl + (environment.production ? '/legal' : sitecorePartialUrl) + '/privacy-policy/';
			break;

		case environment.brandMap.johnWieland:
			//Terms/Policy links: use /sitecore URLs in lower enviornments
			this.termsUrl = brandBaseUrl + (environment.production ? '' : sitecorePartialUrl) + '/terms-of-use/';
			this.policyUrl = brandBaseUrl + (environment.production ? '' : sitecorePartialUrl) + '/privacy-policy/';
			break;

		default:
			this.termsUrl = brandBaseUrl + '/terms-of-use/';
			this.policyUrl = brandBaseUrl + '/privacy-policy/';
			break;
		}

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
		).subscribe((state) => 
		{
			this.isPresale = state.buildMode === BuildMode.Presale
		});
	}

	onDisclaimerClick()
	{
		const ngbModalOptions: NgbModalOptions =
		{
			centered: true,
			backdrop: true,
			keyboard: false,
		};

		this.disclaimerModal = this.modalService.open(InfoDisclaimerComponent, ngbModalOptions, true);
	}
}
