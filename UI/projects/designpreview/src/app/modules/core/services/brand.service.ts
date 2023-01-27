import { Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import * as pulte from '../../../../brands/pulte.json';
import * as delwebb from '../../../../brands/delwebb.json';
import * as americanWest from '../../../../brands/americanwest.json';
import * as divosta from '../../../../brands/divosta.json';
import * as centex from '../../../../brands/centex.json';
import * as johnWieland from '../../../../brands/john-wieland.json';

import { applyBrand, getBrandImageSrc, getBannerImageSrc } from 'phd-common';

@Injectable()
export class BrandService
{
	environment = environment;
	brandMap = {};

	constructor()
	{
		this.brandMap[environment.brandMap.pulte] = (pulte as any).default;
		this.brandMap[environment.brandMap.delwebb] = (delwebb as any).default;
		this.brandMap[environment.brandMap.americanWest] = (americanWest as any).default;
		this.brandMap[environment.brandMap.divosta] = (divosta as any).default;
		this.brandMap[environment.brandMap.centex] = (centex as any).default;
		this.brandMap[environment.brandMap.johnWieland] = (johnWieland as any).default;
	}

	applyBrandStyles(): void
	{
		applyBrand(this.brandMap);
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

		let brandName = '';
		const baseUrl = window.location.host;

		switch (baseUrl) {
			case (environment.brandMap.americanWest):
				brandName = displayMode===BrandDisplayMode.Title ? BrandTitles.AmericanWest : 
					(displayMode===BrandDisplayMode.LogoutUrl ? environment.brandLogoutMap.americanWest : Brands.AmericanWest);
				break;			
			case (environment.brandMap.centex):
				brandName = displayMode===BrandDisplayMode.Title ? BrandTitles.Centex : 
					(displayMode===BrandDisplayMode.LogoutUrl ? environment.brandLogoutMap.centex : Brands.Centex);
				break;			
			case (environment.brandMap.delwebb):
				brandName = displayMode===BrandDisplayMode.Title ? BrandTitles.DelWebb : 
					(displayMode===BrandDisplayMode.LogoutUrl ? environment.brandLogoutMap.delwebb : Brands.DelWebb);
				break;
			case (environment.brandMap.divosta):
				brandName = displayMode===BrandDisplayMode.Title ? BrandTitles.Divosta : 
					(displayMode===BrandDisplayMode.LogoutUrl ? environment.brandLogoutMap.divosta : Brands.Divosta);
				break;
			case (environment.brandMap.johnWieland):
				brandName = displayMode===BrandDisplayMode.Title ? BrandTitles.JohnWieland : 
					(displayMode===BrandDisplayMode.LogoutUrl ? environment.brandLogoutMap.johnWieland : Brands.JohnWieland);
				break;
			case (environment.brandMap.pulte):
				brandName = displayMode===BrandDisplayMode.Title ? BrandTitles.Pulte : 
					(displayMode===BrandDisplayMode.LogoutUrl ? environment.brandLogoutMap.pulte : Brands.Pulte);
				break;
		}

		return brandName;
	}

	//read host only with https from config logoutUrl
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

export enum BrandTitles
{
	Pulte = 'Pulte',
	DelWebb = 'Del Webb',
	AmericanWest = 'American West',
	Centex = 'Centex',
	Divosta = 'DiVosta',
	JohnWieland = 'John Wieland'
}

//displayMode: 
//	title: display brand in title case 
//	logoutUrl: display brand logout page url
//	null or default: display brand name in one word
export enum BrandDisplayMode
{
	Title = 'title',
	LogoutUrl = 'logoutUrl'
}