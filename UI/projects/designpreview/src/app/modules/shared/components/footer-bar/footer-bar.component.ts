import { Component, OnInit } from '@angular/core';

import { ModalRef, ModalService, UnsubscribeOnDestroy } from 'phd-common';
import { environment } from '../../../../../environments/environment';
import { BrandService } from '../../../core/services/brand.service';

import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { InfoDisclaimerComponent } from '../../../core/components/info-disclaimer/info-disclaimer.component';

@Component({
	selector: 'footer-bar',
	templateUrl: 'footer-bar.component.html',
	styleUrls: ['footer-bar.component.scss']
	})
export class FooterBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	brandTheme: string;
	currentYear = new Date().getFullYear();
	accessibilityImgSrc = 'assets/icon_accessibility.png';
	equalHousingImgSrc = 'assets/icon_equalHousing.png';
	disclaimerModal: ModalRef;
	termsUrl: string;
	policyUrl: string;

	constructor(private brandService: BrandService,
		private modalService: ModalService)
	{
		super();
	}

	ngOnInit()
	{
		//set terms and policy urls per brand per enviornments
		this.policyUrl = this.brandService.getBrandPrivacyPolicyUrl();
		this.termsUrl = this.brandService.getBrandTermsOfUseUrl();

		this.brandTheme = this.brandService.getBrandTheme()
	}

	onDisclaimerClick()
	{
		const ngbModalOptions: NgbModalOptions =
		{
			centered: true,
			backdrop: true,
			keyboard: false,
			windowClass: this.brandTheme,
		};

		this.disclaimerModal = this.modalService.open(InfoDisclaimerComponent, ngbModalOptions, true);
	}
}
