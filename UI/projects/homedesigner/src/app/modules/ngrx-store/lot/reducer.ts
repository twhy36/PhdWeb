import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Lot, LotExt } from 'phd-common';
import { LotActions, LotActionTypes } from './actions';
import { CommonActionTypes } from '../actions';

import * as _ from 'lodash';

export interface State
{
	lots: Array<Lot>,
	lotsLoading: boolean,
	hasError: boolean,
	selectedLot?: LotExt,
	selectedHanding: string
}

export const initialState: State = { lots: null, lotsLoading: false, hasError: false, selectedLot: null, selectedHanding: null };

export function reducer(state: State = initialState, action: LotActions): State
{
	switch (action.type)
	{
		case LotActionTypes.LoadLots:
			return { ...state, lotsLoading: true, hasError: false };

		case LotActionTypes.LotsLoaded:
			let selectedLot = _.cloneDeep(state.selectedLot);

			if (selectedLot) {
				selectedLot = { ...selectedLot, monotonyRules: action.lots.find(l => l.id === selectedLot.id).monotonyRules };
			}

			return { ...state, lotsLoading: false, hasError: false, lots: action.lots, selectedLot: selectedLot };

		case LotActionTypes.LoadError:
			return { ...state, lotsLoading: false, hasError: true };

		case CommonActionTypes.SalesAgreementLoaded:
			let lots = action.lot ? [action.lot] : [];

			return { ...state, selectedLot: action.lot, lots: state.lots && state.lots.length > 0 ? state.lots : lots };

		default:
			return state;
	}
}

export const selectLot = createFeatureSelector<State>('lot');

export const selectSelectedLot = createSelector(
	selectLot,
	(state) => state ? state.selectedLot : null
);
