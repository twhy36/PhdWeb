import { OrgActions, OrgActionTypes } from './actions';
import { SalesCommunity } from 'phd-common';
import { CommonActionTypes } from '../actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export interface State
{
	salesCommunity: SalesCommunity,
	salesCommunityLoading: boolean,
	hasError: boolean
}

export const initialState: State = { salesCommunity: null, salesCommunityLoading: false, hasError: false };

export function reducer(state: State = initialState, action: OrgActions): State
{
	switch (action.type)
	{
		case OrgActionTypes.LoadSalesCommunity:
			return { ...state, salesCommunityLoading: true, hasError: false };
		case OrgActionTypes.SalesCommunityLoaded:
			return { ...state, salesCommunityLoading: false, hasError: false, salesCommunity: action.community };
		case OrgActionTypes.LoadError:
			return { ...state, salesCommunityLoading: false, hasError: true };
		case CommonActionTypes.ScenarioLoaded:
		case CommonActionTypes.SalesAgreementLoaded:
		case CommonActionTypes.JobLoaded:
			return { ...state, salesCommunity: action.salesCommunity };
		default:
			return state;
	}
}

export const selectOrg = createFeatureSelector<State>('org');

export const market = createSelector(
	selectOrg,
	(state) =>
	{
		return !!state && !!state.salesCommunity ? state.salesCommunity.market : null;
	}
);
