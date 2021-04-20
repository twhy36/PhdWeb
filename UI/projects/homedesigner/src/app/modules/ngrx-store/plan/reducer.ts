import { createSelector, createFeatureSelector } from '@ngrx/store';
import { Plan } from 'phd-common';

import { PlanActions, PlanActionTypes } from './actions';
import { CommonActionTypes } from '../actions';

export interface State
{
	plans: Array<Plan>,
	hasError: boolean,
	selectedPlan?: number,
	selectedTree?: number,
	marketingPlanId: number[],
	selectedPlanLoading: boolean
}

export const initialState: State = { plans: null, hasError: false, selectedPlan: null, marketingPlanId: [], selectedPlanLoading: false };

export function reducer(state: State = initialState, action: PlanActions): State
{
	switch (action.type)
	{
		case PlanActionTypes.LoadSelectedPlan:
			return { ...state, selectedPlanLoading: true, hasError: false };

		case PlanActionTypes.SelectedPlanLoaded:
			return { ...state, selectedPlanLoading: false, hasError: false, plans: action.plans };

		case PlanActionTypes.LoadError:
			return { ...state, selectedPlanLoading: false, hasError: true };

		case CommonActionTypes.SalesAgreementLoaded:
			return { ...state, marketingPlanId: action.webPlanMappings, selectedPlan: action.selectedPlanId, selectedTree: action.tree && action.tree.treeVersion ? action.tree.treeVersion.id : null };
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
