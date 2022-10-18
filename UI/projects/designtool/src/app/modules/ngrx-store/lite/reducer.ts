import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as _ from 'lodash';

import { ScenarioOption, ScenarioOptionColor } from 'phd-common'
import
	{
		LitePlanOption, Elevation, IOptionCategory, LiteMonotonyRule, LitePlanOptionUI, IOptionSubCategory
	} from '../../shared/models/lite.model';

import { LiteActions, LiteActionTypes } from './actions';

export interface State
{
	isPhdLite: boolean,
	isSaving: boolean,
	isScenarioLoaded: boolean,
	isUnsaved: boolean;
	options: LitePlanOption[],
	scenarioOptions: ScenarioOption[];
	categories: IOptionCategory[];
	liteMonotonyRules: LiteMonotonyRule[];
	elevationOverrideNote: string;
	colorSchemeOverrideNote: string;
}

export const initialState: State =
{
	isPhdLite: false,
	isScenarioLoaded: false,
	isSaving: false,
	isUnsaved: false,
	options: [],
	scenarioOptions: [],
	categories: [],
	liteMonotonyRules: [],
	elevationOverrideNote: null,
	colorSchemeOverrideNote: null
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

				action.scenarioOptions?.forEach(opt =>
				{
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

				return { ...state, scenarioOptions: newOptions, isUnsaved: true };
			}

		case LiteActionTypes.SelectOptionColors:
			{
				let newOptions = _.cloneDeep(state.scenarioOptions);

				action.optionColors.forEach(color =>
				{
					let scenarioOption = newOptions.find(opt => opt.edhPlanOptionId === color.edhPlanOptionId);
					if (scenarioOption)
					{
						const optionColorIndex = scenarioOption.scenarioOptionColors
							? scenarioOption.scenarioOptionColors.findIndex(c => c.colorItemId === color.colorItemId && c.colorId === color.colorId)
							: -1;

						if (optionColorIndex >= 0 && color.isDeleted)
						{
							scenarioOption.scenarioOptionColors.splice(optionColorIndex, 1);
						}
						else if (optionColorIndex < 0 && !color.isDeleted)
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

				return { ...state, scenarioOptions: newOptions, isUnsaved: true };
			}

		case LiteActionTypes.SaveScenarioOptions:
		case LiteActionTypes.SaveScenarioOptionColors:
			return { ...state, isSaving: true };

		case LiteActionTypes.ScenarioOptionsSaved:
			return { ...state, isSaving: false, scenarioOptions: action.scenarioOptions, isUnsaved: false };

		case LiteActionTypes.OptionCategoriesLoaded:
			return { ...state, categories: action.categories };

		case LiteActionTypes.LiteMonotonyRulesLoaded:
			return { ...state, liteMonotonyRules: action.monotonyRules };

		case LiteActionTypes.SetLiteOverrideReason:
			{
				return action.isElevation
					? { ...state, elevationOverrideNote: action.overrideReason }
					: { ...state, colorSchemeOverrideNote: action.overrideReason };
			}

		case LiteActionTypes.ResetLiteState:
			return { ...initialState };

		default:
			return state;
	}
}

export const liteState = createFeatureSelector<State>('lite');

export const elevationOptions = createSelector(
	liteState,
	(state) =>
	{
		const elevations = state?.options?.filter(option => option.optionSubCategoryId === Elevation.Detached || option.optionSubCategoryId === Elevation.Attached) || [];
		return _.sortBy(elevations, 'name');
	});

export const selectedElevation = createSelector(
	liteState,
	elevationOptions,
	(state, elevations) =>
	{
		return elevations.find(elev => state.scenarioOptions?.find(opt => opt.edhPlanOptionId === elev.id && opt.planOptionQuantity > 0));
	}
);

export const selectedColorScheme = createSelector(
	liteState,
	selectedElevation,
	(state, elevation) =>
	{
		let colorScheme: ScenarioOptionColor = null;

		if (elevation)
		{
			const scenarioOption = state.scenarioOptions?.find(opt => opt.edhPlanOptionId === elevation.id);
			if (scenarioOption?.scenarioOptionColors?.length)
			{
				const optionColor = scenarioOption.scenarioOptionColors[0];
				if (elevation.colorItems.some(ci => ci.colorItemId === optionColor.colorItemId && ci.color.some(cl => cl.colorId === optionColor.colorId)))
				{
					// Color scheme is selected when it is in scenario option color and the color item id and the color id exist in the selected elevation
					colorScheme = optionColor;
				}
			}
		}

		return colorScheme;
	}
);

export const selectedOptionCategories = createSelector(
	liteState,
	(state) =>
	{
		return state?.categories;
	}
);

export const areColorSelectionsValid = createSelector(
	liteState,
	selectedElevation,
	selectedOptionCategories,
	(state, selectedElevationOption, selectedOptionCategories) =>
	{
		const options = state.options;
		const scenarioOptions = state.scenarioOptions;
		const selectedOptions = options
			.filter(option => scenarioOptions.some(so => so.edhPlanOptionId === option.id)
				&& option.id !== selectedElevationOption?.id
				&& option.colorItems.length > 0
				&& option.colorItems.some(ci => ci.isActive && ci.color.length > 0 && ci.color.some(c => c.isActive)));

		const allOptionSubCategories = _.cloneDeep(selectedOptionCategories)
			.map(c => c.optionSubCategories)
			.reduce((all, a) => all.concat(a), []);

		allOptionSubCategories.forEach(subcategory =>
		{
			const subcategoryOptions = selectedOptions
				.map(x => x as LitePlanOptionUI)
				.filter(x => x.optionSubCategoryId === subcategory.id && x.colorItems.length > 0);

			subcategory.planOptions = _.cloneDeep(subcategoryOptions)
				.sort((option1, option2) =>
				{
					return option1.name > option2.name ? 1 : -1;
				});

			subcategory.planOptions.forEach(po =>
			{
				//only keep color items that are active and has one or more active colors associated with it
				po.colorItems = po.colorItems
					.filter(ci => ci.isActive && ci.color.length > 0 && ci.color.some(c => c.isActive))
					.sort((ci1, ci2) => ci1.name > ci2.name ? 1 : -1);

				//only keep colors that are active
				po.colorItems.forEach(ci =>
				{
					ci.color = ci.color
						.filter(c => c.isActive)
						.sort((c1, c2) => c1.name > c2.name ? 1 : -1)
				})
			})
		});

		let subcategories: IOptionSubCategory[] = [];

		//Only keep subCategories where the option has some related color items defined;
		allOptionSubCategories.forEach(subcategory =>
		{
			subcategory.planOptions?.forEach(option =>
			{
				if (option.colorItems.length && subcategories.every(x => x.id !== option.optionSubCategoryId))
				{
					subcategories.push(subcategory);
				}
			});
		});

		const allScenarioOptions = scenarioOptions
			.map(so => so.scenarioOptionColors)
			.reduce((all, a) => all.concat(a), []);

		const allPlanOptions = subcategories
			.map(so => so.planOptions ?? [])
			.reduce((all, a) => all.concat(a), []);

		const allColorItems = allPlanOptions ? allPlanOptions
			.map(so => so.colorItems)
			.reduce((all, a) => all.concat(a), []) : [];

		// Add coloritems for selected elevation option
		selectedElevationOption?.colorItems.forEach(c =>
		{
			if (c.isActive && c.color.some(c => c.isActive))
			{
				allColorItems.push(c);
			}
		});

		let isValid = true;

		allColorItems.forEach(item =>
		{
			const foundColorItem = allScenarioOptions.find(i => i.colorItemId === item?.colorItemId);
			const foundColor = item.color?.find(c => c.colorId === foundColorItem?.colorId);

			if (!foundColor)
			{
				isValid = false;
			}
		});

		return isValid;
	}
);
