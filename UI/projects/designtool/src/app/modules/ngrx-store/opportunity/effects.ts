import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, of, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { OpportunityService } from '../../core/services/opportunity.service';
import { OpportunityActionTypes, LoadOpportunity, OpportunityLoaded } from './actions';
import { LoadPlans } from '../plan/actions';
import { LoadLots } from '../lot/actions';
import { LoadSalesCommunity } from '../org/actions';

@Injectable()
export class OpportunityEffects
{
	constructor(
		private actions$: Actions,
		private oppService: OpportunityService
	) { }

	loadPlans$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<LoadOpportunity>(OpportunityActionTypes.LoadOpportunity),
			switchMap(action => this.oppService.getOpportunityContactAssoc(action.opportunityId)),
			switchMap(opp =>
			{
				return from([
					new OpportunityLoaded(opp),
					new LoadPlans(opp.opportunity.salesCommunityId),
					new LoadLots(opp.opportunity.salesCommunityId),
					new LoadSalesCommunity(opp.opportunity.salesCommunityId)
				]);
			})
		);
	});
}
