import {
	ChangeOrderChoice, SDGroup, SDSubGroup, SDPoint, SDChoice, Group, DesignToolAttribute
} from "phd-common";

import * as _ from 'lodash';
import { IOptionCategory, IOptionSubCategory, LitePlanOption, ScenarioOption, ScenarioOptionColor } from '../models/lite.model';
import * as fromLite from '../../ngrx-store/lite/reducer';

export function getCurrentHouseSelections(groups: Array<Group>)
{
	const selectionSummary = groups.map(g =>
	{
		let group = new SDGroup(g);

		group.subGroups = g.subGroups.map(sg =>
		{
			let subGroup = new SDSubGroup(sg);

			subGroup.points = sg.points.map(p =>
			{
				let point = new SDPoint(p);

				point.choices = p.choices.map(c =>
				{
					let choice = new SDChoice(c);

					return choice;
				}).filter(c => c.quantity > 0);

				return point;
			}).filter(dp => !!dp.choices.length)

			return subGroup;
		}).filter(sg => !!sg.points.length);

		return group;
	}).filter(g => !!g.subGroups.length);

	return selectionSummary;
}

export function getChangeOrderGroupSelections(groups: Array<Group>, jobChangeOrderChoices: Array<ChangeOrderChoice>)
{
	return _.flatMap(groups, g =>
	{
		return _.flatMap(g.subGroups, sg =>
		{
			return sg.points.map(dp =>
			{
				let point = new SDPoint(dp);
				point.groupName = g.label;
				point.subGroupName = sg.label;

				point.choices = dp.choices.map<SDChoice>(ch =>
				{
					let c = jobChangeOrderChoices.filter(c => c.divChoiceCatalogId === ch.divChoiceCatalogId);
					if (c.length)
					{
						const added = c.find(ch => ch.action === 'Add');
						const deleted = c.find(ch => ch.action === 'Delete');
						if (added && deleted
							&& added.choiceLabel === deleted.choiceLabel
							&& added.decisionPointChoiceCalculatedPrice === deleted.decisionPointChoiceCalculatedPrice
							&& added.quantity === deleted.quantity
							&& (!added.jobChangeOrderChoiceAttributes || added.jobChangeOrderChoiceAttributes.every(att => deleted.jobChangeOrderChoiceAttributes?.some(att2 => att.attributeCommunityId === att2.attributeCommunityId && att.attributeGroupCommunityId === att2.attributeGroupCommunityId)))
							&& (!added.jobChangeOrderChoiceLocations || added.jobChangeOrderChoiceLocations?.every(loc => deleted.jobChangeOrderChoiceLocations?.some(loc2 => 
								loc.locationCommunityId === loc2.locationCommunityId && loc.quantity === loc2.quantity
								&& (!loc.jobChangeOrderChoiceLocationAttributes || loc.jobChangeOrderChoiceLocationAttributes?.every(att => loc2.jobChangeOrderChoiceLocationAttributes?.some(att2 => att.attributeCommunityId === att2.attributeCommunityId && att.attributeGroupCommunityId === att2.attributeGroupCommunityId)))
								)))
						)
						{
							return null;
						}

						let choice = new SDChoice(ch);
						choice.quantity = c[0].quantity;
						if (dp.dPointTypeId === 1)
						{
							choice.isElevationChoice = true;
						}
						return choice;
					} else
					{
						return null;
					}
				}).filter(ch => !!ch);

				return point;
			}).filter(dp => dp.choices.length);
		});
	});
}

// BEGIN PHD Lite
export function getLiteCurrentHouseSelections(lite: fromLite.State, selectedElevation: LitePlanOption, selectedColorScheme: ScenarioOptionColor, baseHouseOptions: { selectedBaseHouseOptions: LitePlanOption[], baseHouseCategory: IOptionCategory }): SDGroup[]
{
	const selectedBaseHouseOptions: LitePlanOption[] = baseHouseOptions.selectedBaseHouseOptions;

	const optionCategories: SDGroup[] = [];
	const allSubCategories = _.flatMap(lite.categories, c => c.optionSubCategories) || [];

	// Add selected elevation
	const elevationChoice = createLiteSDChoice(selectedElevation.name, selectedElevation.description, selectedElevation.listPrice);
	const elevationPoint = createLiteSDPoint('Elevation', [elevationChoice]);
	
	// Add color scheme
	const colorSchemes = _.flatMap(selectedElevation?.colorItems, item => item.color);
	const color = colorSchemes?.find(c => c.colorItemId === selectedColorScheme.colorItemId && c.colorId === selectedColorScheme.colorId);
	const colorSchemeChoice = createLiteSDChoice(color?.name);
	const colorSchemePoint = createLiteSDPoint('Color Scheme', [colorSchemeChoice]);
	
	const blankSubGroup = createLiteSDSubGroup('Elevation & Color Scheme', [elevationPoint, colorSchemePoint])
	const exteriorGroup = createLiteSDGroup('Exterior', [blankSubGroup]);
	optionCategories.push(exteriorGroup);

	// Add other selected options FIRST
	const selectedOptions = lite.options.filter(option =>
		lite.scenarioOptions?.find(opt => opt.edhPlanOptionId === option.id)
		&& (!selectedElevation || selectedElevation.id !== option.id)
		&& !selectedBaseHouseOptions?.find(opt => opt.id === option.id));
	const optionCategoryGroups = _.groupBy(selectedOptions, option => option.optionCategoryId);
	let sortedOptionCategories: SDGroup[] = []

	for (const categoryId in optionCategoryGroups)
	{
		const category = lite.categories?.find(category => category.id === +categoryId);
		if (category)
		{
			const subCategories = buildLiteOptionSubCategories(optionCategoryGroups[categoryId], allSubCategories, lite.scenarioOptions);
			const optionCategories = createLiteSDGroup(category?.name, subCategories);
			sortedOptionCategories.push(optionCategories);
		}
	};

	optionCategories.push(...(_.sortBy(sortedOptionCategories, 'label')));

	// Add selected base house options LAST
	if (selectedBaseHouseOptions?.length)
	{
		const baseHouseCategory = baseHouseOptions.baseHouseCategory;
		const baseHouseSubCategories = buildLiteOptionSubCategories(selectedBaseHouseOptions, allSubCategories, lite.scenarioOptions);
		const baseHouseCategories = createLiteSDGroup(baseHouseCategory.name, baseHouseSubCategories);
		optionCategories.push(baseHouseCategories);
	}

	return optionCategories;
}

export function buildLiteOptionSubCategories(options: LitePlanOption[], subCategories: IOptionSubCategory[], scenarioOptions: ScenarioOption[]): SDSubGroup[]
{
	let optionSubCategories: SDSubGroup[] = [];

	const optionsubCategories = _.groupBy(options, o => o.optionSubCategoryId);
	for (const subCategoryId in optionsubCategories)
	{
		const subCategory = subCategories.find(subCategory => subCategory.id === +subCategoryId);
		if (subCategoryId)
		{
			const sortedOptionSubCategories = _.sortBy(optionsubCategories[subCategoryId], 'name');
			const points = sortedOptionSubCategories.map(option =>
			{
				const scenarioOption = scenarioOptions?.find(opt => opt.edhPlanOptionId === option.id);
				const optionChoice = buildLiteOptionChoice(option, scenarioOption);
				const optionPoint = createLiteSDPoint(option.financialOptionIntegrationKey, [optionChoice]);
				return optionPoint;
			});
			const optionSubCategory = createLiteSDSubGroup(subCategory?.name, points);
			optionSubCategories.push(optionSubCategory);
		}
	};

	return optionSubCategories;
}

export function buildLiteOptionChoice(option: LitePlanOption, scenarioOption: ScenarioOption): SDChoice {
	const choice = createLiteSDChoice(option.name, option.description, option.listPrice, scenarioOption.planOptionQuantity, buildLiteOptionColors(option, scenarioOption));
	return choice;
}

export function buildLiteOptionColors(option: LitePlanOption, scenarioOption: ScenarioOption): DesignToolAttribute[]
{
	let optionColors: DesignToolAttribute[] = [];

	scenarioOption?.scenarioOptionColors?.forEach(scnOptColor =>
	{
		const colorItem = option.colorItems?.find(item => item.colorItemId === scnOptColor.colorItemId);
		const color = colorItem?.color?.find(c => c.colorId === scnOptColor.colorId);

		if (colorItem && color)
		{
			const optionColor = createLiteDTAttribute(colorItem.name, color.name);
			optionColors.push(optionColor);
		}
	});

	return optionColors;
}

export const createLiteSDGroup = (label: string, subGroups: SDSubGroup[] = []): SDGroup => (
	{
		id: 0,
		label,
		subGroups
	}
);

export const createLiteSDSubGroup = (label: string, points: SDPoint[] = []): SDSubGroup => (
	{
		id: 0,
		label,
		useInteractiveFloorplan: false,
		points
	}
);

export const createLiteSDPoint = (label: string, choices: SDChoice[] = []): SDPoint => (
	{
		id: 0,
		label,
		choices,
		completed: false,
		status: '0',
		price: 0,
		dPointTypeId: 0,
		groupName: null,
		subGroupName: null
	}
);

export const createLiteSDChoice = (label: string, description: string = null, price: number = null, quantity: number = 1, selectedAttributes: DesignToolAttribute[] = []): SDChoice => (
	{
		id: 0,
		label,
		imagePath: null,
		quantity,
		maxQuantity: 1,
		price,
		selectedAttributes,
		options: [],
		hasChoiceRules: false,
		hasOptionRules: false,
		hasAttributes: false,
		hasLocations: false,
		isElevationChoice: false,
		description,
		attributeReassignments: []
	}
);

export const createLiteDTAttribute = (label: string, value: string): DesignToolAttribute => (
	{
		attributeGroupId: null,
		attributeGroupLabel: label,
		attributeGroupName: null,
		attributeId: null,
		attributeImageUrl: null,
		attributeName: value,
		manufacturer: null,
		sku: null,
		locationGroupId: null,
		locationGroupLabel: null,
		locationGroupName: null,
		locationId: null,
		locationName: null,
		locationQuantity: null,
		scenarioChoiceLocationId: null,
		scenarioChoiceLocationAttributeId: null
	}
);
// END PHD Lite