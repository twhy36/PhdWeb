import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class PresaleGuard implements CanActivate
{
	constructor(private authService: AuthService) { }

	canActivate(route: ActivatedRouteSnapshot)
	{
		const planGuid = route.queryParams.plan;
		if (planGuid)
		{
			return (sessionStorage.getItem('presale_guid') === planGuid)
				|| this.authService.getIsPresaleAuthenticated(route.queryParams.plan, window.location.hostname);
		}
		else
		{
			return false;
		}
	}
}
