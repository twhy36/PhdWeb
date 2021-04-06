import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Lot, LotExt } from '../../shared/models/lot.model';
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

			if (selectedLot)
			{
				selectedLot = { ...selectedLot, monotonyRules: action.lots.find(l => l.id === selectedLot.id).monotonyRules };
			}

			return { ...state, lotsLoading: false, hasError: false, lots: action.lots, selectedLot: selectedLot };
		case LotActionTypes.LoadError:
			return { ...state, lotsLoading: false, hasError: true };
		case LotActionTypes.SelectLot:
			return { ...state, lotsLoading: true };
		case LotActionTypes.SelectedLotLoaded:
			const monotonyRules = state.lots && state.lots.length ? state.lots.find(l => l.id === action.selectedLot.id).monotonyRules : null;

			return { ...state, lotsLoading: false, selectedLot: { ...action.selectedLot, monotonyRules: monotonyRules } };
		case LotActionTypes.SelectHanding:
			return { ...state, selectedHanding: action.handing };
		case LotActionTypes.DeselectLot:
			return { ...state, selectedLot: null };
		case CommonActionTypes.SalesAgreementLoaded:
		case CommonActionTypes.JobLoaded:
		case CommonActionTypes.ScenarioLoaded:
			let lots = action.lot ? [action.lot] : [];

			return { ...state, selectedLot: action.lot, lots: state.lots && state.lots.length > 0 ? state.lots : lots };
		case LotActionTypes.MonotonyRulesLoaded:
			{
				let newLots = _.cloneDeep(state.lots);
				let newSelectedLot = _.cloneDeep(state.selectedLot);

				newLots.forEach(l =>
				{
					const rule = action.monotonyRules && action.monotonyRules.length
						? action.monotonyRules.find(r => r.edhLotId === l.id)
						: null;

					l.monotonyRules = rule ? rule.relatedLotsElevationColorScheme : [];

					if (newSelectedLot.id === l.id)
					{
						newSelectedLot.monotonyRules = rule ? rule.relatedLotsElevationColorScheme : [];
					}
				});

				return { ...state, selectedLot: newSelectedLot, lots: newLots };
			}
		default:
			return state;
	}
}

export const selectLot = createFeatureSelector<State>('lot');

export const dirtLots = createSelector(
	selectLot,
	(state) => state.lots ? state.lots.filter(x => x.lotBuildTypeDesc !== 'Spec') : []
);

export const specLots = createSelector(
	selectLot,
	(state) => state.lots ? state.lots.filter(x => x.lotBuildTypeDesc === 'Spec') : []
);

export const lotsLoaded = createSelector(
	selectLot,
	(state) => state.lots && state.lots.length > 0
);

export const selectSelectedLot = createSelector(
	selectLot,
	(state) => state ? state.selectedLot : null
);
