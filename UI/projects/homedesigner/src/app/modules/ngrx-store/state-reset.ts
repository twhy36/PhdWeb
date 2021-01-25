import { ActionReducer } from '@ngrx/store';

import { LoadSalesAgreement } from './actions';

import * as fromScenario from './scenario/reducer';
import * as fromLot from './lot/reducer';
import * as fromPlan from './plan/reducer';
import * as fromOrg from './org/reducer';
import * as fromSalesAgreement from './sales-agreement/reducer';
import * as fromJob from './job/reducer';
import * as fromChangeOrder from './change-order/reducer';

/**
 * Reset action to its initial state
 * @param reducer
 */
export function stateReset(reducer: ActionReducer<any>): ActionReducer<any>
{
	return function (state, action)
	{
		if ((action instanceof LoadSalesAgreement && action.clearState))
		{
			state = {
				salesAgreement: fromSalesAgreement.initialState,
				lot: fromLot.initialState,
				plan: fromPlan.initialState,
				org: fromOrg.initialState,
				job: fromJob.initialState,
				changeOrder: fromChangeOrder.initialState,
				scenario: fromScenario.initialState
			};
		}

		return reducer(state, action);
	}
}
