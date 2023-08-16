import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Store, select } from '@ngrx/store';

import { of } from 'rxjs';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { IdentityService } from 'phd-common';

import * as fromRoot from '../../ngrx-store/reducers';
import * as CommonActions from '../../ngrx-store/actions';
import * as ScenarioActions from '../../ngrx-store/scenario/actions';

import { AuthService } from '../services/auth.service';
import { environment } from '../../../../environments/environment';
import { clearPresaleSessions } from '../../shared/classes/utils.class';
import { BuildMode } from '../../shared/models/build-mode.model';

@Injectable()
export class InternalGuard
{
	constructor(
		private identityService: IdentityService,
		private authService: AuthService,
		private store: Store<fromRoot.State>,) { }

	canActivate(route: ActivatedRouteSnapshot,)
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
			withLatestFrom(
				this.store.pipe(select(state => state.salesAgreement)),
				this.store.pipe(select(state => state.scenario)),
			),
			switchMap(([loggedIn, salesAgreement, scenario]) =>
			{
				if (!loggedIn)
				{
					this.identityService.login({ provider: 'azureAD' });
					return of(false);
				}

				const salesAgreementId = +route.params.salesAgreementId || +route.queryParams.salesAgreementId;
				const treeVersionId = +route.params.treeVersionId || +route.queryParams.treeVersionId;

				if (treeVersionId
					&& (!scenario.tree 
						|| scenario.tree.treeVersion.id !== treeVersionId
						|| scenario.buildMode != BuildMode.Preview))
				{
					this.store.dispatch(new ScenarioActions.LoadPreview(treeVersionId));
				}
				else if (salesAgreementId > 0 && salesAgreement.id !== salesAgreementId)
				{
					this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreementId));
				}

				return of(true);
			}),
		);
	}
}
