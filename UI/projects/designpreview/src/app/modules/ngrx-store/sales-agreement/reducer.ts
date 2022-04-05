import { Action, createFeatureSelector, createSelector } from '@ngrx/store';

import * as _ from "lodash";

import { SalesAgreement } from 'phd-common';

import { RehydrateMap } from "../sessionStorage";
import { CommonActionTypes, SalesAgreementLoaded } from "../actions";

export interface State extends SalesAgreement
{
	isFloorplanFlipped: boolean,
	isDesignComplete: boolean,
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
	isDesignComplete: false,
	loadError: false,
	salesAgreementLoading: false
};

export function reducer(state: State = initialState, action: Action): State
{
	switch (action.type)
	{
		case CommonActionTypes.LoadSalesAgreement:
			return { ...state, salesAgreementLoading: true, loadError: false };		
		case CommonActionTypes.SalesAgreementLoaded:
			{
				const saAction = action as SalesAgreementLoaded;
				return {
					...state,
					...saAction.salesAgreement,
					isFloorplanFlipped: saAction.info ? saAction.info.isFloorplanFlipped : false,
					isDesignComplete: saAction.info ? saAction.info.isDesignComplete : false,
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

export const salesAgreementId = createSelector(
	salesAgreementState,
	(state) => state?.id || 0
);
