import { Action, createFeatureSelector } from '@ngrx/store';

import * as _ from "lodash";

import { SalesAgreement } from 'phd-common';

import { RehydrateMap } from "../sessionStorage";
import { CommonActionTypes, SalesAgreementLoaded } from "../actions";

export interface State extends SalesAgreement
{
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
