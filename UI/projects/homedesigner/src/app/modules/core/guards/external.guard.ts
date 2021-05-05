import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, switchMap, tap } from 'rxjs/operators';
import { NEVER } from 'rxjs';

import { IdentityService } from 'phd-common';
import { AuthService } from '../services/auth.service';
import { SalesAgreementService } from '../services/sales-agreement.service';
import { environment } from '../../../../environments/environment';

import * as fromRoot from '../../ngrx-store/reducers';
import * as CommonActions from '../../ngrx-store/actions';

@Injectable()
export class ExternalGuard implements CanActivate
{
	constructor(
		private identityService: IdentityService, 
		private authService: AuthService,
		private store: Store<fromRoot.State>,
		private salesAgreementService: SalesAgreementService) { }

	canActivate()
	{
        this.authService.setAuthConfig(environment.authConfigs["sitecoreSSO"]);

        return this.identityService.isLoggedIn.pipe(
			map(loggedIn => {
				if (!loggedIn) {
					this.identityService.login({ provider: "sitecoreSSO" });
					return false; //redirect to access denied if error?
				}

				return true;
			}),
			switchMap(isLoggedIn => {
				if (!isLoggedIn){
					return NEVER;
				}

				return this.salesAgreementService.getSalesAgreement();
			}),
			tap(salesAgreement => {
				this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreement.id));
			}),
			map(() => true)
		);
	}
}
