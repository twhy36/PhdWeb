import { ActionReducer } from '@ngrx/store';

import { LoadSalesAgreement, LoadScenario } from './actions';
import { LoadJobForJob } from './job/actions';
import { LoadOpportunity } from './opportunity/actions';

import * as fromScenario from './scenario/reducer';
import * as fromLot from './lot/reducer';
import * as fromPlan from './plan/reducer';
import * as fromNav from './nav/reducer';
import * as fromOpp from './opportunity/reducer';
import * as fromOrg from './org/reducer';
import * as fromUser from './user/reducer';
import * as fromSummary from './summary/reducer';
import * as fromSalesAgreement from './sales-agreement/reducer';
import * as fromJob from './job/reducer';
import * as fromChangeOrder from './change-order/reducer';
import * as fromContract from './contract/reducer';

/**
 * Reset action to its initial state
 * @param reducer
 */
export function stateReset(reducer: ActionReducer<any>): ActionReducer<any>
{
	return function (state, action)
	{
		if ((action instanceof LoadSalesAgreement && action.clearState) || action instanceof LoadScenario || (action instanceof LoadJobForJob && action.clearState) || action instanceof LoadOpportunity)
		{
			state = {
				salesAgreement: fromSalesAgreement.initialState,
				lot: fromLot.initialState,
				plan: fromPlan.initialState,
				nav: fromNav.initialState,
				opportunity: fromOpp.initialState,
				org: fromOrg.initialState,
				summary: fromSummary.initialState,
				job: fromJob.initialState,
				changeOrder: fromChangeOrder.initialState,
				contract: fromContract.initialState,
				user: fromUser.initialState,
				scenario: fromScenario.initialState
			};
		}

		return reducer(state, action);
	}
}
