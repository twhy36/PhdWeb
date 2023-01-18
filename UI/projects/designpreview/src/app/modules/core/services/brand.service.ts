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

	getBrandedLogoutUrl()
	{
		const baseUrl = window.location.host;
		if (environment.brandMap.pulte === baseUrl)
		{
			return environment.brandLogoutMap.pulte;
		} else if (environment.brandMap.delwebb === baseUrl)
		{
			return environment.brandLogoutMap.delwebb;
		} else if (environment.brandMap.americanWest === baseUrl)
		{
			return environment.brandLogoutMap.americanWest;
		} else if (environment.brandMap.divosta === baseUrl)
		{
			return environment.brandLogoutMap.divosta;
		} else if (environment.brandMap.johnWieland === baseUrl)
		{
			return environment.brandLogoutMap.johnWieland;
		}
	}

	getBrandName(useTitleFormat?: boolean)
	{
		const baseUrl = window.location.host;
		if (environment.brandMap.pulte === baseUrl)
		{
			return useTitleFormat ? BrandTitles.Pulte : Brands.Pulte;
		} else if (environment.brandMap.delwebb === baseUrl)
		{
			return  useTitleFormat ? BrandTitles.DelWebb : Brands.DelWebb;
		} else if (environment.brandMap.americanWest === baseUrl)
		{
			return  useTitleFormat ? BrandTitles.AmericanWest : Brands.AmericanWest;
		} else if (environment.brandMap.centex === baseUrl)
		{
			return  useTitleFormat ? BrandTitles.Centex : Brands.Centex;
		} else if (environment.brandMap.divosta === baseUrl)
		{
			return  useTitleFormat ? BrandTitles.Divosta : Brands.Divosta;
		} else if (environment.brandMap.johnWieland === baseUrl)
		{
			return  useTitleFormat ? BrandTitles.JohnWieland : Brands.JohnWieland;
		}
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