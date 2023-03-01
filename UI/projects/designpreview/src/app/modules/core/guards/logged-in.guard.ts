import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { IdentityService } from 'phd-common';
import { environment } from '../../../../environments/environment';
import { clearPresaleSessions } from '../../shared/classes/utils.class';
import { ExternalGuard } from './external.guard';

@Injectable()
export class LoggedInGuard implements CanActivate
{
	constructor(private identityService: IdentityService,
		private externalGuard: ExternalGuard,
		private router: Router) { }

	canActivate(route: ActivatedRouteSnapshot)
	{
		if (route.queryParams.plan)
		{
			if (sessionStorage.getItem('presale_issuer'))
			{
				return sessionStorage.getItem('presale_issuer') === environment.authConfigs['presale'].issuer;
			}
			else
			{
				return this.router.navigate(['presale'], { queryParams: { plan: route.queryParams.plan } });
			}
		}
		else
		{
			clearPresaleSessions();
		}

		if (!sessionStorage.getItem('authProvider'))
		{
			return this.externalGuard.canActivate();
		}
		return this.identityService.isLoggedIn;
	}
}
