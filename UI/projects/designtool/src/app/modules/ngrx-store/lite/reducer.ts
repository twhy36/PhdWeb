import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as _ from "lodash";

import { LitePlanOption, Elevation, ScenarioOption, ScenarioOptionColor } from '../../shared/models/lite.model';
import { LiteActions, LiteActionTypes } from './actions';

export interface State
{
	isPhdLite: boolean,
	isSaving: boolean,
	isScenarioLoaded: boolean,
	options: LitePlanOption[],
	scenarioOptions: ScenarioOption[];
}

export const initialState: State = 
{ 
	isPhdLite: false, 
	isScenarioLoaded: false, 
	isSaving: false, 
	options: [], 
	scenarioOptions: [] 
};

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

		case LiteActionTypes.SelectOptionColors:
		{
			let newOptions = _.cloneDeep(state.scenarioOptions);

			action.optionColors.forEach(color => {
				let scenarioOption = newOptions.find(opt => opt.scenarioOptionId === color.scenarioOptionId);
				if (scenarioOption)
				{
					const optionColorIndex = scenarioOption.scenarioOptionColors 
						? scenarioOption.scenarioOptionColors.findIndex(c => c.colorItemId === color.colorItemId && c.colorId === color.colorId)
						: -1;
						
					if (optionColorIndex >= 0 && color.isDeleted)
					{
						scenarioOption.scenarioOptionColors.splice(optionColorIndex, 1);
					}
					else if (optionColorIndex < 0  && !color.isDeleted)
					{
						if (!scenarioOption.scenarioOptionColors)
						{
							scenarioOption.scenarioOptionColors = [];
						}

						scenarioOption.scenarioOptionColors.push({
							scenarioOptionColorId: color.scenarioOptionColorId,
							scenarioOptionId: color.scenarioOptionId,
							colorItemId: color.colorItemId,
							colorId: color.colorId,							
						})
					}					
				}
			});

			return { ...state, scenarioOptions: newOptions };
		}

		case LiteActionTypes.SaveScenarioOptions:
		case LiteActionTypes.SaveScenarioOptionColors:
			return { ...state, isSaving: true };

		case LiteActionTypes.ScenarioOptionsSaved:
			return { ...state, isSaving: false, scenarioOptions: action.scenarioOptions };

		case LiteActionTypes.SetScenarioLoaded:
			return {  ...state, isScenarioLoaded: action.isLoaded };
	
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

export const selectedElevation = createSelector(
	liteState,
	elevationOptions,
	(state, elevations) => {
		return elevations.find(elev => state.scenarioOptions?.find(opt => opt.edhPlanOptionId === elev.id && opt.planOptionQuantity > 0));
	}
);

export const selectedColorScheme = createSelector(
	liteState,
	selectedElevation,
	(state, elevation) => {
		let colorScheme : ScenarioOptionColor = null;

		if (elevation) 
		{
			const scenarioOption = state.scenarioOptions?.find(opt => opt.edhPlanOptionId === elevation.id);
			if (scenarioOption?.scenarioOptionColors?.length)
			{
				colorScheme = scenarioOption.scenarioOptionColors[0];
			}
		}

		return colorScheme;
	}
);
