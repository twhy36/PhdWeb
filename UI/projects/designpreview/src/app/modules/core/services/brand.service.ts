import { Injectable } from '@angular/core';

import { getBrandImageSrc, getBannerImageSrc } from 'phd-common';

import { environment } from '../../../../environments/environment';
import * as pulte from '../../../../brands/pulte.json';
import * as delwebb from '../../../../brands/delwebb.json';
import * as americanWest from '../../../../brands/americanwest.json';
import * as divosta from '../../../../brands/divosta.json';
import * as centex from '../../../../brands/centex.json';
import * as johnWieland from '../../../../brands/john-wieland.json';

import { Constants } from '../../shared/classes/constants.class';

@Injectable()
export class BrandService
{
	environment = environment;
	brandMap = {};
	brandLogout: string;
	brandName: string;
	brandTitle: string;
	brandTheme: string;
	isMobile: boolean;

	constructor()
	{
		this.brandMap[environment.brandMap.pulte] = pulte['default'];
		this.brandMap[environment.brandMap.delwebb] = delwebb['default'];
		this.brandMap[environment.brandMap.americanWest] = americanWest['default'];
		this.brandMap[environment.brandMap.divosta] = divosta['default'];
		this.brandMap[environment.brandMap.centex] = centex['default'];
		this.brandMap[environment.brandMap.johnWieland] = johnWieland['default'];
		this.initialize();		
	}

	initialize(): void
	{
		const baseUrl = window.location.host;

		switch (baseUrl) 
		{
			case (environment.brandMap.americanWest):
				this.brandLogout = environment.brandLogoutMap.americanWest;
				this.brandName = Brands.AmericanWest;
				this.brandTheme = BrandThemes.AmericanWest;
				this.brandTitle = BrandTitles.AmericanWest;
				break;			
			case (environment.brandMap.centex):
				this.brandLogout = environment.brandLogoutMap.centex;
				this.brandName = Brands.Centex;
				this.brandTheme = BrandThemes.Centex;
				this.brandTitle = BrandTitles.Centex;
				break;			
			case (environment.brandMap.delwebb):
				this.brandLogout = environment.brandLogoutMap.delwebb;
				this.brandName = Brands.DelWebb;
				this.brandTheme = BrandThemes.DelWebb;
				this.brandTitle = BrandTitles.DelWebb;
				break;
			case (environment.brandMap.divosta):
				this.brandLogout = environment.brandLogoutMap.divosta;
				this.brandName = Brands.Divosta;
				this.brandTheme = BrandThemes.DiVosta;
				this.brandTitle = BrandTitles.Divosta;
				break;
			case (environment.brandMap.johnWieland):
				this.brandLogout = environment.brandLogoutMap.johnWieland;
				this.brandName = Brands.JohnWieland;
				this.brandTheme = BrandThemes.JohnWieland;
				this.brandTitle = BrandTitles.JohnWieland;
				break;
			case (environment.brandMap.pulte):
				this.brandLogout = environment.brandLogoutMap.pulte;
				this.brandName = Brands.Pulte;
				this.brandTheme = BrandThemes.Pulte;
				this.brandTitle = BrandTitles.JohnWieland;
				break;
		}
	}

	getBrandTheme(): string
	{
		return this.brandTheme;
	}

	getBrandImage(imageProperty: string): string
	{
		return getBrandImageSrc(this.brandMap, imageProperty);
	}

	getBannerImage(bannerPos: number): string
	{
		return getBannerImageSrc(this.brandMap, bannerPos);
	}

	getBrandName(displayMode?: BrandDisplayMode)
	{
		if (typeof window === 'undefined' && typeof document === 'undefined')
		{
			return '';
		}

		switch(displayMode)
		{
			case(BrandDisplayMode.Title):
				return this.brandTitle;
			case(BrandDisplayMode.LogoutUrl):
				return this.brandLogout;
			default:
				return this.brandName;
		}
	}

	// read host only with https from config logoutUrl
	getBrandHomeUrl()
	{
		let url = this.getBrandName(BrandDisplayMode.LogoutUrl);
		if (url?.length)
		{
			url = url.toLowerCase();
			if (url.indexOf('https://') > -1)
			{
				url = url.substring(0, url.split('/', 3).join('/').length);
			}
			else
			{
				url = 'https://' + url.substring(0, url.indexOf('/'));
			}
		}

		return url;
	}

	getBrandPrivacyPolicyUrl()
	{
		let privacyPolicyUrl = this.getBrandHomeUrl();

		switch (window.location.host)
		{
			case environment.brandMap.americanWest:

				// Privacy Policy links: use /sitecore URLs in lower enviornments, and /legal URL for production
				privacyPolicyUrl += (environment.production ? '/legal' : Constants.URL_SITECORE_PARTIAL) + '/privacy-policy/';
				break;

			case environment.brandMap.johnWieland:
				// Privacy Policy links: use /sitecore URLs in lower enviornments
				privacyPolicyUrl += (environment.production ? '' : Constants.URL_SITECORE_PARTIAL) + '/privacy-policy/';
				break;

			default:
				privacyPolicyUrl += '/privacy-policy/';
				break;
		}
		return privacyPolicyUrl;
	}

	getBrandTermsOfUseUrl()
	{
		let termsOfUseUrl = this.getBrandHomeUrl();

		switch (window.location.host)
		{
			case environment.brandMap.americanWest:

				// Privacy Policy links: use /sitecore URLs in lower enviornments, and /legal URL for production
				termsOfUseUrl += (environment.production ? '/legal' : Constants.URL_SITECORE_PARTIAL) + '/terms-of-use/';
				break;

			case environment.brandMap.johnWieland:
				// Privacy Policy links: use /sitecore URLs in lower enviornments
				termsOfUseUrl += (environment.production ? '' : Constants.URL_SITECORE_PARTIAL) + '/terms-of-use/';
				break;

			default:
				termsOfUseUrl += '/terms-of-use/';
				break;
		}
		return termsOfUseUrl;
	}
}

export enum Brands
{
	Pulte = 'pulte',
	DelWebb = 'delwebb',
	AmericanWest = 'americanWest',
	Centex = 'centex',
	Divosta = 'divosta',
	JohnWieland = 'johnWieland'
}

export enum BrandThemes
{
	Pulte = 'ph-theme',
	DelWebb = 'dw-theme',
	AmericanWest = 'aw-theme',
	Centex = 'ch-theme',
	DiVosta = 'dv-theme',
	JohnWieland = 'jw-theme'
}

export enum BrandTitles
{
	Pulte = 'Pulte',
	DelWebb = 'Del Webb',
	AmericanWest = 'American West',
	Centex = 'Centex',
	Divosta = 'DiVosta',
	JohnWieland = 'John Wieland'
}

// DisplayMode: 
// title: display brand in title case 
// logoutUrl: display brand logout page url
// null or default: display brand name in one word
export enum BrandDisplayMode
{
	Title = 'title',
	LogoutUrl = 'logoutUrl'
}