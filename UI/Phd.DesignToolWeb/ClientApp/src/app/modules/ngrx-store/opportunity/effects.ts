import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable ,  of ,  from } from 'rxjs';
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

	@Effect()
	loadPlans$: Observable<Action> = this.actions$.pipe(
		ofType<LoadOpportunity>(OpportunityActionTypes.LoadOpportunity),
		switchMap(action => this.oppService.getOpportunityContactAssoc(action.opportunityId).pipe(map(opp => { return { opp, oppId: action.opportunityId }; }))),
		switchMap(opp => !opp.opp ? this.oppService.getOpportunityFromCRM(opp.oppId) : of(opp.opp)),
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
}
