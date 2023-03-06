/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionReducer } from '@ngrx/store';

import { LoadSalesAgreement } from './actions';

import * as fromScenario from './scenario/reducer';
import * as fromPlan from './plan/reducer';
import * as fromNav from './nav/reducer';
import * as fromOrg from './org/reducer';
import * as fromSalesAgreement from './sales-agreement/reducer';
import * as fromJob from './job/reducer';
import * as fromChangeOrder from './change-order/reducer';
import * as fromFavorite from './favorite/reducer';
import { LoadPresale, LoadPreview } from './scenario/actions';

/**
 * Reset action to its initial state excluding 'app' for LoadSalesAgreement
 * @param reducer
 */
export function stateReset(reducer: ActionReducer<any>): ActionReducer<any>
{
	return function (state, action)
	{
		let newState = state;

		if ((action instanceof LoadSalesAgreement
			|| action instanceof LoadPreview
			|| action instanceof LoadPresale)
			&& action.clearState)
		{
			newState = {
				...state,
				salesAgreement: fromSalesAgreement.initialState,
				plan: fromPlan.initialState,
				nav: fromNav.initialState,
				org: fromOrg.initialState,
				job: fromJob.initialState,
				changeOrder: fromChangeOrder.initialState,
				scenario: fromScenario.initialState,
				favorite: fromFavorite.initialState
			};
		}

		return reducer(newState, action);
	}
}
