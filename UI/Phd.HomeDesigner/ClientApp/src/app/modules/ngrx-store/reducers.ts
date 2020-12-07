import { ActionReducerMap, createSelector } from '@ngrx/store';

import * as fromScenario from './scenario/reducer';
import * as fromLot from './lot/reducer';
import * as fromPlan from './plan/reducer';
import * as fromOrg from './org/reducer';
import * as fromSalesAgreement from './sales-agreement/reducer';
import * as fromJob from './job/reducer';
import * as fromChangeOrder from './change-order/reducer';

export interface State
{
	scenario: fromScenario.State;
	lot: fromLot.State;
	plan: fromPlan.State;
	org: fromOrg.State;
	salesAgreement: fromSalesAgreement.State;
	job: fromJob.State;
	changeOrder: fromChangeOrder.State;
}

export const reducers: ActionReducerMap<State> = {
	scenario: fromScenario.reducer,
	lot: fromLot.reducer,
	plan: fromPlan.reducer,
	org: fromOrg.reducer,
	salesAgreement: fromSalesAgreement.reducer,
	job: fromJob.reducer,
	changeOrder: fromChangeOrder.reducer
}

export const showSpinner = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromJob.jobState,
	(sa, job) => {
		return (sa ? sa.salesAgreementLoading : false) || (job ? job.jobLoading : false);
	}
);
