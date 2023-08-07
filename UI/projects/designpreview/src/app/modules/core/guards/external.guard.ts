import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';

import { IdentityService } from 'phd-common';
import { map, switchMap, tap, take } from 'rxjs/operators';
import { NEVER, combineLatest, of } from 'rxjs';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import * as CommonActions from '../../ngrx-store/actions';

import { AuthService } from '../services/auth.service';
import { SalesAgreementService } from '../services/sales-agreement.service';
import { environment } from '../../../../environments/environment';
import { clearPresaleSessions } from '../../shared/classes/utils.class';

@Injectable()
export class ExternalGuard
{
	constructor(
		private identityService: IdentityService,
		private authService: AuthService,
		private store: Store<fromRoot.State>,
		private salesAgreementService: SalesAgreementService) { }

	canActivate()
	{
		clearPresaleSessions();
		
		if (!sessionStorage.getItem('authProvider'))
		{
			sessionStorage.setItem('authProvider', 'sitecoreSSO');
			this.authService.setAuthConfig(environment.authConfigs['sitecoreSSO']);
		}

		return combineLatest([this.identityService.isLoggedIn.pipe(
			map(loggedIn =>
			{
				if (!loggedIn)
				{
					this.identityService.login({ provider: 'sitecoreSSO' });
					return false; //redirect to access denied if error?
				}

				return true;
			})
		),
		this.store.pipe(select(fromSalesAgreement.salesAgreementState), take(1)),
		this.store.pipe(select(fromScenario.selectScenario), take(1))
		]).pipe(
			switchMap(([isLoggedIn, sag, selectScenario]) =>
			{
				if (!isLoggedIn)
				{
					return NEVER;
				}

				if (!!sag?.id || !!selectScenario?.tree?.id)
				{
					return of(true);
				}
				else
				{
					return this.salesAgreementService.getSalesAgreement().pipe(
						tap(salesAgreement => this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreement.id))),
						map(() => true)
					);
				}
			})
		);
	}
}
