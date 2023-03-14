import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { map } from 'rxjs/operators';

import { IdentityService } from 'phd-common';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../../environments/environment';
import { clearPresaleSessions } from '../../shared/classes/utils.class';

@Injectable()
export class InternalGuard implements CanActivate
{
	constructor(private identityService: IdentityService, private authService: AuthService) { }

	canActivate(route: ActivatedRouteSnapshot)
	{
		// clear presale sessions when switching from presale to others mode internal access
		if (sessionStorage.getItem('authProvider')?.includes('presale') && !route.url.toString().includes('plan'))
		{
			clearPresaleSessions();
		}

		if (!sessionStorage.getItem('authProvider'))
		{
			sessionStorage.setItem('authProvider', 'azureAD');
			this.authService.setAuthConfig(environment.authConfigs['azureAD']);
		}

		return this.identityService.isLoggedIn.pipe(
			map(loggedIn =>
			{
				if (!loggedIn)
				{
					this.identityService.login({ provider: 'azureAD' });
					return false; // redirect to access denied if error?
				}

				return true;
			})
		);
	}
}
