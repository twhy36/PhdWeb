import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as _ from "lodash";

import { LitePlanOption, Elevation, ScenarioOption } from '../../shared/models/lite.model';
import { LiteActions, LiteActionTypes } from './actions';

export interface State
{
	isPhdLite: boolean,
	isSaving: boolean,
	options: LitePlanOption[],
	scenarioOptions: ScenarioOption[];
}

export const initialState: State = { isPhdLite: false, isSaving: false, options: [], scenarioOptions: [] };

export function reducer(state: State = initialState, action: LiteActions): State
{
	switch (action.type)
	{
		case LiteActionTypes.SetIsPhdLite:
			return { ...state, isPhdLite: action.isPhdLite };

		case LiteActionTypes.LiteOptionsLoaded:
			return { ...state, options: action.options, scenarioOptions: action.scenarioOptions };

		case LiteActionTypes.SelectOptions:
		{
			let newOptions = _.cloneDeep(state.scenarioOptions);

			action.scenarioOptions?.forEach(opt => {
				const optionIndex = newOptions.findIndex(newOpt => newOpt.edhPlanOptionId === opt.edhPlanOptionId);
				if (optionIndex > -1)
				{
					if (opt.planOptionQuantity === 0)
					{
						newOptions.splice(optionIndex, 1);
					}
					else
					{
						newOptions[optionIndex].planOptionQuantity = opt.planOptionQuantity;
					}
				}
				else
				{
					newOptions.push(opt);
				}
			});

			return { ...state, scenarioOptions: newOptions };			
		}

		case LiteActionTypes.SaveScenarioOptions:
			return { ...state, isSaving: true };

		case LiteActionTypes.ScenarioOptionsSaved:
			return { ...state, isSaving: false, scenarioOptions: action.scenarioOptions };
			
		default:
			return state;
	}
}

export const liteState = createFeatureSelector<State>('lite');

export const elevationOptions = createSelector(
	liteState,
	(state) => {
		const elevations = state.options.filter(option => option.optionSubCategoryId === Elevation.Detached || option.optionSubCategoryId === Elevation.Attached);
		return _.sortBy(elevations, 'name');
	});

export const isElevationSelected = createSelector(
	liteState,
	elevationOptions,
	(state, elevations) => {
		return !!elevations.find(elev => state.scenarioOptions?.find(opt => opt.edhPlanOptionId === elev.id && opt.planOptionQuantity > 0));
	}
);
