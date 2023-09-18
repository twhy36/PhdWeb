import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';

import { tap } from 'rxjs/operators';

import * as fromRoot from '../../ngrx-store/reducers';
import * as ScenarioActions from '../../ngrx-store/scenario/actions';

import { AuthService } from '../services/auth.service';
import { environment } from '../../../../environments/environment';

@Injectable()
export class PresaleGuard
{
	constructor(private authService: AuthService,
		private store: Store<fromRoot.State>) { }

	canActivate(route: ActivatedRouteSnapshot)
	{
		const planGuid = route.queryParams.plan;
		if (planGuid)
		{
			return (sessionStorage.getItem('presale_issuer') === environment.authConfigs['presale'].issuer && sessionStorage.getItem('presale_guid') === planGuid && sessionStorage.getItem('authProvider') === 'presale')
				|| this.authService.getIsPresaleAuthenticated(planGuid, window.location.hostname)
					.pipe(
						tap(isAuthenticated =>
						{
							if (isAuthenticated)
							{
								const planCommunityId = Number(sessionStorage.getItem('presale_plan_community_id'));
								this.store.dispatch(new ScenarioActions.LoadPresale(planCommunityId));
							}
						}));
		}
		else
		{
			return false;
		}
	}
}
