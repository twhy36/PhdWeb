import { createSelector, createFeatureSelector } from '@ngrx/store';
import { Plan } from 'phd-common';
import { PlanActions, PlanActionTypes } from './actions';
import { CommonActionTypes } from '../actions';

export interface State
{
	plans: Array<Plan>,
	plansLoading: boolean,
	hasError: boolean,
	selectedPlan?: number,
	selectedTree?: number,
	marketingPlanId: number[],
	selectedPlanLoading: boolean
}

export const initialState: State = { plans: null, plansLoading: false, hasError: false, selectedPlan: null, marketingPlanId: [], selectedPlanLoading: false };

export function reducer(state: State = initialState, action: PlanActions): State
{
	switch (action.type)
	{
		case PlanActionTypes.LoadPlans:
			return { ...state, plansLoading: true, hasError: false };
		case PlanActionTypes.PlansLoaded:
			return { ...state, plansLoading: false, hasError: false, plans: action.plans };
		case PlanActionTypes.LoadError:
			return { ...state, plansLoading: false, hasError: true };
		case PlanActionTypes.SelectPlan:
			let marketingPlanId: number[];

			if (action.marketingPlanId)
			{
				marketingPlanId = action.marketingPlanId;
			}
			else
			{
				marketingPlanId = state.plans ? state.plans.find(p => p.id === action.planId).marketingPlanId : [];
			}

			return { ...state, selectedPlan: action.planId, selectedTree: action.treeVersionId, marketingPlanId: marketingPlanId };
		case PlanActionTypes.DeselectPlan:
			return { ...state, selectedPlan: null, selectedTree: null, marketingPlanId: [] };
		case PlanActionTypes.SetWebPlanMapping:
			return { ...state, marketingPlanId: action.marketingPlanId };
		case CommonActionTypes.ScenarioLoaded:
			return { ...state, marketingPlanId: action.marketingPlanId, selectedPlan: action.scenario.planId, selectedTree: action.tree && action.tree.treeVersion ? action.tree.treeVersion.id : null };
		case PlanActionTypes.LoadSelectedPlan:
			return { ...state, selectedPlanLoading: true, hasError: false };
		case PlanActionTypes.SelectedPlanLoaded:
			return { ...state, selectedPlanLoading: false, hasError: false };
		case CommonActionTypes.SalesAgreementLoaded:
		case CommonActionTypes.JobLoaded:
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
