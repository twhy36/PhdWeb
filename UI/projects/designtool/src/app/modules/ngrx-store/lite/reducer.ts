import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as _ from "lodash";

import { LitePlanOption, Elevation } from '../../shared/models/lite.model';
import { LiteActions, LiteActionTypes } from './actions';

export interface State
{
	isPhdLite: boolean,
	isSaving: boolean,
	options: LitePlanOption[]
}

export const initialState: State = { isPhdLite: false, isSaving: false, options: [] };

export function reducer(state: State = initialState, action: LiteActions): State
{
	switch (action.type)
	{
		case LiteActionTypes.SetIsPhdLite:
			return { ...state, isPhdLite: action.isPhdLite };

		case LiteActionTypes.LiteOptionsLoaded:
			return { ...state, options: action.options };

		case LiteActionTypes.SelectOptions:
		{
			let newOptions = _.cloneDeep(state.options);

			newOptions.forEach(option => {
				option.scenarioOption = action.options.find(opt => option.id === opt.edhPlanOptionId);
			});

			return { ...state, options: newOptions };			
		}

		case LiteActionTypes.SaveScenarioOptions:
			return { ...state, isSaving: true };

		case LiteActionTypes.ScenarioOptionsSaved:
			return { ...state, isSaving: false };
			
		default:
			return state;
	}
}

export const liteState = createFeatureSelector<State>('lite');

export const elevationOptions = createSelector(
	liteState,
	(state) => state.options.filter(option => option.optionSubCategoryId === Elevation.Detached || option.optionSubCategoryId === Elevation.Attached)
);

export const isElevationSelected = createSelector(
	elevationOptions,
	(elevations) => !!elevations.find(elev => elev.scenarioOption?.planOptionQuantity > 0)
);
