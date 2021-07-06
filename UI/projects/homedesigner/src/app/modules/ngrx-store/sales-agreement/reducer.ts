import { Action, createFeatureSelector, createSelector } from '@ngrx/store';

import * as _ from "lodash";

import { SalesAgreement } from 'phd-common';

import { RehydrateMap } from "../sessionStorage";
import { CommonActionTypes, SalesAgreementLoaded } from "../actions";

export interface State extends SalesAgreement
{
	isFloorplanFlipped: boolean,
	loadError: boolean,
	salesAgreementLoading: boolean
}

RehydrateMap.onRehydrate<State>("salesAgreement", state =>
{
	return {
		...state,
		salesAgreementLoading: false,
		loadError: false
	};
});

export const initialState: State = {
	...new SalesAgreement(),
	isFloorplanFlipped: false,
	loadError: false,
	salesAgreementLoading: false,
};

export function reducer(state: State = initialState, action: Action): State
{
	switch (action.type)
	{
		case CommonActionTypes.SalesAgreementLoaded:
			{
				const saAction = action as SalesAgreementLoaded;
				return {
					...state,
					...saAction.salesAgreement,
					isFloorplanFlipped: saAction.info ? saAction.info.isFloorplanFlipped : false,
					salesAgreementLoading: false,
					loadError: false
				};
			}
		case CommonActionTypes.LoadError:
			return { ...state, salesAgreementLoading: false, loadError: true };
		default:
			return state;
	}
}

//selectors
export const salesAgreementState = createFeatureSelector<State>("salesAgreement");

export const primaryBuyer = createSelector(
	salesAgreementState,
	(state) => state && state.buyers ? state.buyers.find(b => b.isPrimaryBuyer) : null
);

export const favoriteTitle = createSelector(
	salesAgreementState,
	primaryBuyer,
	(state, primaryBuyer) =>
	{
		if (state?.id) 
		{
			const contact = primaryBuyer?.opportunityContactAssoc?.contact;
			return `${contact ? contact.lastName || '' : ''} Favorites`;
		}
		else 
		{
			return 'Favorites';
		}
	}
);
