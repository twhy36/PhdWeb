import { createSelector, createFeatureSelector } from '@ngrx/store';
import { Plan } from 'phd-common';

import { PlanActions, PlanActionTypes } from './actions';
import { CommonActionTypes } from '../actions';
import _ from 'lodash';

export interface State
{
	plans: Array<Plan>,
	hasError: boolean,
	selectedPlan?: number,
	selectedTree?: number,
	marketingPlanId: number[],
	selectedPlanLoading: boolean,
	plansLoading: boolean;
}

export const initialState: State = { plans: null, hasError: false, selectedPlan: null, marketingPlanId: [], selectedPlanLoading: false, plansLoading: false };

export function reducer(state: State = initialState, action: PlanActions): State
{
	switch (action.type)
	{
	case PlanActionTypes.SelectPlan:
		const marketingPlanId = action.marketingPlanId || (state.plans ? state.plans.find(p => p.id === action.planId).marketingPlanId : []);

		return { ...state, selectedPlan: action.planId, selectedTree: action.treeVersionId, marketingPlanId: marketingPlanId };

	case PlanActionTypes.PlansLoaded:
		return { ...state, plansLoading: false, hasError: false, plans: action.plans };

	case PlanActionTypes.LoadSelectedPlan:
		return { ...state, selectedPlanLoading: true, hasError: false };

	case PlanActionTypes.SelectedPlanLoaded:
		return { ...state, marketingPlanId: _.flatMap(action.plans, p => p.marketingPlanId), selectedPlanLoading: false, hasError: false, plans: action.plans };

	case PlanActionTypes.LoadError:
		return { ...state, selectedPlanLoading: false, hasError: true };

	case PlanActionTypes.SetWebPlanMapping:
		return { ...state, marketingPlanId: action.marketingPlanId };

	case CommonActionTypes.SalesAgreementLoaded:
		return { ...state, selectedPlan: action.selectedPlanId, selectedTree: action.tree && action.tree.treeVersion ? action.tree.treeVersion.id : null };
	default:
		return state;
	}
}

//selectors
export const planState = createFeatureSelector<State>('plan');

export const selectedPlanData = createSelector(
	planState,
	(state) => state && state.selectedPlan && state.plans ? state.plans.find(p => p.id === state.selectedPlan) : null
);
