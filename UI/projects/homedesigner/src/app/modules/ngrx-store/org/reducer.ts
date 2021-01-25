import { Action, createFeatureSelector, createSelector } from '@ngrx/store';
import { SalesCommunity } from 'phd-common';
import { CommonActionTypes, SalesAgreementLoaded } from '../actions';

export interface State
{
	salesCommunity: SalesCommunity,
	salesCommunityLoading: boolean,
	hasError: boolean
}

export const initialState: State = { salesCommunity: null, salesCommunityLoading: false, hasError: false };

export function reducer(state: State = initialState, action: Action): State
{
	switch (action.type)
	{
		case CommonActionTypes.SalesAgreementLoaded:
			{
				const saAction = action as SalesAgreementLoaded;
				return { ...state, salesCommunity: saAction.salesCommunity };
			}

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
