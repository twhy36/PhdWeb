import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { IdentityService } from 'phd-common';

@Injectable()
export class LoggedInGuard implements CanActivate
{
	constructor(private identityService: IdentityService) { }

	canActivate()
	{
		return this.identityService.isLoggedIn;
	}
}
