import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { Buffer } from 'buffer';

import { environment } from '../../../../environments/environment';
import { PresalePayload } from '../../shared/models/presale-payload.model';

@Injectable()
export class PresaleGuard implements CanActivate
{
	constructor() { }

	canActivate(route: ActivatedRouteSnapshot)
	{
		const token = sessionStorage.getItem('presaleToken') || route.queryParams.presale;
		
		if (!!token)
		{
			if (!sessionStorage.getItem('presaleToken'))
			{
				sessionStorage.setItem('presale_token', token);
			}

			const tokenParts = token.split('.');
			const payload = new PresalePayload(JSON.parse(Buffer.from(tokenParts[1], 'base64').toString()));
	
			if (!sessionStorage.getItem('authProvider'))
			{
				sessionStorage.setItem('authProvider', 'presale');
			}
	
			if (!sessionStorage.getItem('presale_issuer'))
			{
				sessionStorage.setItem('presale_issuer', payload.iss);
			}
		}
		return sessionStorage.getItem('presale_issuer') === environment.authConfigs["presale"].issuer;
	}
}
