import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { map } from 'rxjs/operators';

import { IdentityService } from 'phd-common';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../../environments/environment';

@Injectable()
export class InternalGuard implements CanActivate
{
	constructor(private identityService: IdentityService, private authService: AuthService) { }

	canActivate()
	{
        this.authService.setAuthConfig(environment.authConfigs["azureAD"]);

        return this.identityService.isLoggedIn.pipe(
			map(loggedIn => {
				if (!loggedIn) {
					this.identityService.login({ provider: "azureAD" });
					return false; //redirect to access denied if error?
				}

				return true;
			})
		);
	}
}
