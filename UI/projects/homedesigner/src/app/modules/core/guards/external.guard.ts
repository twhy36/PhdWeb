import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { map, switchMap, tap, take } from 'rxjs/operators';
import { NEVER, combineLatest, of } from 'rxjs';

import { IdentityService } from 'phd-common';
import { LoadSalesAgreement } from 'phd-store';
import { AuthService } from '../services/auth.service';
import { SalesAgreementService } from '../services/sales-agreement.service';
import { environment } from '../../../../environments/environment';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';

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
		if (!sessionStorage.getItem('authProvider')){
			sessionStorage.setItem('authProvider', 'sitecoreSSO');
        	this.authService.setAuthConfig(environment.authConfigs["sitecoreSSO"]);
		}

        return combineLatest([ this.identityService.isLoggedIn.pipe(
				map(loggedIn => {
					if (!loggedIn) {
						this.identityService.login({ provider: "sitecoreSSO" });
						return false; //redirect to access denied if error?
					}

					return true;
				})
			),
			this.store.pipe(select(fromSalesAgreement.salesAgreementState), take(1))
		]).pipe(
			switchMap(([isLoggedIn, sag]) => {
				if (!isLoggedIn){
					return NEVER;
				}

				if (!!sag.id) {
					return of(true);
				} else {
					return this.salesAgreementService.getSalesAgreement().pipe(
						tap(salesAgreement => this.store.dispatch(new LoadSalesAgreement(salesAgreement.id))),
						map(() => true)
					);
				}
			})
		);
	}
}
