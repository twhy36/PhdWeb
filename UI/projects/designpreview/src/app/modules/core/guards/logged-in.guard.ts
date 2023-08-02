import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { IdentityService } from 'phd-common';
import { environment } from '../../../../environments/environment';
import { clearPresaleSessions } from '../../shared/classes/utils.class';
import { ExternalGuard } from './external.guard';
import { PresaleGuard } from './presale.guard';

@Injectable()
export class LoggedInGuard
{
	constructor(private identityService: IdentityService,
		private externalGuard: ExternalGuard,
		private presaleGuard: PresaleGuard) { }

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
				return this.presaleGuard.canActivate(route);
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
