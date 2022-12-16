import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { IdentityService } from 'phd-common';
import { environment } from '../../../../environments/environment';
import { ExternalGuard } from './external.guard';

@Injectable()
export class LoggedInGuard implements CanActivate
{
	constructor(private identityService: IdentityService,
		private externalGuard: ExternalGuard,
		private router: Router) { }

	canActivate(route: ActivatedRouteSnapshot)
	{
		if (sessionStorage.getItem('presale_issuer'))
		{
			return sessionStorage.getItem('presale_issuer') === environment.authConfigs["presale"].issuer;
		}
		if (!sessionStorage.getItem('authProvider'))
		{
			if (route.queryParams.presale)
			{
				return this.router.navigate(['presale'], { queryParams: { presale: route.queryParams.presale } });
			}
			else
			{
				return this.externalGuard.canActivate();
			}
		}
		return this.identityService.isLoggedIn;
	}
}
