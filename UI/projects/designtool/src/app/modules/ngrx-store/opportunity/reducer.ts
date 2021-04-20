import { createSelector, createFeatureSelector } from '@ngrx/store';

import { OpportunityContactAssoc } from 'phd-common';
import { OpportunityActions, OpportunityActionTypes } from './actions';
import { CommonActionTypes } from '../actions';

export interface State
{
	loadingOpportunity: boolean,
	opportunityContactAssoc: OpportunityContactAssoc
}

export const initialState: State = {
	loadingOpportunity: false,
	opportunityContactAssoc: {
		contactId: null,
		contact: null,
		id: null,
		opportunity: null,
		isPrimary: false
	}
}

export function reducer(state: State = initialState, action: OpportunityActions): State
{
	switch (action.type)
	{
		case OpportunityActionTypes.LoadOpportunity:
			return { ...state, loadingOpportunity: true };
		case OpportunityActionTypes.OpportunityLoaded:
		case CommonActionTypes.ScenarioLoaded:
		case CommonActionTypes.SalesAgreementLoaded:
			return { ...state, loadingOpportunity: false, opportunityContactAssoc: action.opportunity };
		case OpportunityActionTypes.OpportunityContactAssocUpdated:
			return { ...state, opportunityContactAssoc: action.opportunity };
		default:
			return state;
	}
}

export const opportunityState = createFeatureSelector<State>('opportunity');

export const opportunityId = createSelector(
	opportunityState,
	(state) => state && state.opportunityContactAssoc && state.opportunityContactAssoc.opportunity ? state.opportunityContactAssoc.opportunity.dynamicsOpportunityId : null
);

export const oppPrimaryContact = createSelector(
	opportunityState,
	(state) => state && state.opportunityContactAssoc ? state.opportunityContactAssoc.contact : null
);

export const salesCommunityId = createSelector(
	opportunityState,
	(state) => state && state.opportunityContactAssoc && state.opportunityContactAssoc.opportunity ? state.opportunityContactAssoc.opportunity.salesCommunityId : null
);
