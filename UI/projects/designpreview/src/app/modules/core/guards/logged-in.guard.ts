import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { clearPresaleSessions } from '../../shared/classes/utils.class';
import { environment } from '../../../../environments/environment';
import { ExternalGuard } from './external.guard';
import { InternalGuard } from './internal.guard';
import { PresaleGuard } from './presale.guard';

@Injectable()
export class LoggedInGuard
{
	constructor(
		private externalGuard: ExternalGuard,
		private internalGuard: InternalGuard,
		private presaleGuard: PresaleGuard
	) {}

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

		if (
			route.params.salesAgreementId ||
			route.params.treeVersionId ||
			route.queryParams.salesAgreementId ||
			route.queryParams.treeVersionId ||
			route.url.some((urlSegment) => urlSegment.path === 'preview')
		) 
		{
			return this.internalGuard.canActivate(route);
		}
		return this.externalGuard.canActivate();
	}
}
