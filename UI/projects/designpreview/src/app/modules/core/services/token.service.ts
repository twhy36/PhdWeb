import { Injectable } from '@angular/core';
import { IdentityService } from 'phd-common';
import { of } from 'rxjs';

@Injectable()
export class TokenService 
{
	constructor(private identityService: IdentityService) { }

	getToken()
	{
		if (sessionStorage.getItem('presale_token'))
		{
			return of(sessionStorage.getItem('presale_token'))
		}
		else
		{
			return this.identityService.token;
		}
	}
}