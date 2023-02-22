import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { Store } from '@ngrx/store';

import { environment } from '../../../../environments/environment';
import { setPresaleToken } from '../../shared/classes/utils.class';
import * as fromRoot from '../../ngrx-store/reducers';
import { ErrorFrom, GuardError } from '../../ngrx-store/error.action';

@Injectable()
export class PresaleGuard implements CanActivate
{
	constructor(private store: Store<fromRoot.State>) { }

	canActivate(route: ActivatedRouteSnapshot)
	{
		setPresaleToken(route.queryParams.presale);

		//can activate when passing issuer match configuration
		if (sessionStorage.getItem('presale_issuer') !== environment.authConfigs['presale'].issuer)
		{
			this.store.dispatch(new GuardError(new Error('Presale issuer does not match configuration!'), 'Config issue in Presale Guard', ErrorFrom.GuardError));
			return false;
		}
		return true;
	}
}
