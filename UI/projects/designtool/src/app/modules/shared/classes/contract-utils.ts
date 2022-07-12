import {
	ChangeOrderChoice, SDGroup, SDSubGroup, SDPoint, SDChoice, Group, DesignToolAttribute,
	ScenarioOption, ScenarioOptionColor, ChangeOrderPlanOption
} from "phd-common";

import * as _ from 'lodash';
import { 
	IOptionCategory, IOptionSubCategory, LitePlanOption, Elevation, ExteriorLabel
} from '../models/lite.model';
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
export function getLiteCurrentHouseSelections(
	lite: fromLite.State, 
	selectedElevation: LitePlanOption, 
	selectedColorScheme: ScenarioOptionColor, 
	baseHouseOptions: { selectedBaseHouseOptions: LitePlanOption[], baseHouseCategory: IOptionCategory },
	planPrice: number
): SDGroup[]
{
	const selectedBaseHouseOptions: LitePlanOption[] = baseHouseOptions.selectedBaseHouseOptions?.map(option => {
		return {...option, listPrice: planPrice};
	});

	const optionCategories: SDGroup[] = [];
	const allSubCategories = _.flatMap(lite.categories, c => c.optionSubCategories) || [];

	// Add selected elevation
	const elevationChoice = createLiteSDChoice(selectedElevation.name, selectedElevation.id, selectedElevation.description, selectedElevation.listPrice);
	const elevationPoint = createLiteSDPoint(ExteriorLabel.Elevation, [elevationChoice]);
	
	// Add color scheme
	const colorSchemes = _.flatMap(selectedElevation?.colorItems, item => item.color);
	const color = colorSchemes?.find(c => c.colorItemId === selectedColorScheme.colorItemId && c.colorId === selectedColorScheme.colorId);
	const colorSchemeChoice = createLiteSDChoice(color?.name, selectedElevation.id, null, 0);
	const colorSchemePoint = createLiteSDPoint(ExteriorLabel.ColorScheme, [colorSchemeChoice]);
	
	const blankSubGroup = createLiteSDSubGroup(ExteriorLabel.ExteriorSubGroup, [elevationPoint, colorSchemePoint])
	const exteriorGroup = createLiteSDGroup(ExteriorLabel.Exterior, [blankSubGroup]);
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
			const subCategoryName = subCategory?.name !== 'BaseHouse' ? subCategory?.name : ''; // Do not show sub-category for base house
			const optionSubCategory = createLiteSDSubGroup(subCategoryName, points);
			optionSubCategories.push(optionSubCategory);
		}
	};

	return optionSubCategories;
}

export function buildLiteOptionChoice(option: LitePlanOption, scenarioOption: ScenarioOption): SDChoice {
	const choice = createLiteSDChoice(option.name, option.id, option.description, option.listPrice, scenarioOption.planOptionQuantity, buildLiteOptionColors(option, scenarioOption));
	return choice;
}

export function buildLiteOptionColors(option: LitePlanOption, scenarioOption: ScenarioOption | ChangeOrderPlanOption): DesignToolAttribute[]
{
	let optionColors: DesignToolAttribute[] = [];

	if (scenarioOption instanceof ChangeOrderPlanOption)
	{
		scenarioOption?.jobChangeOrderPlanOptionAttributes?.forEach(coPlanOption => {
			const optionColor = createLiteDTAttribute(coPlanOption.attributeGroupLabel, coPlanOption.attributeName);
			optionColors.push(optionColor);			
		})
	}
	else
	{
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
	}

	optionColors.sort((a, b) => a.attributeGroupLabel.localeCompare(b.attributeGroupLabel));
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

export const createLiteSDChoice = (label: string, planOptionId: number = null, description: string = null, price: number = null, quantity: number = 1, selectedAttributes: DesignToolAttribute[] = []): SDChoice => (
	{
		id: 0,
		divChoiceCatalogId: planOptionId,	// used for option filtering
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

export function getLiteChangeOrderGroupSelections(
	jobChangeOrderPlanOptions: ChangeOrderPlanOption[],
	baseHouseOptions: { selectedBaseHouseOptions: LitePlanOption[], baseHouseCategory: IOptionCategory },
	options: LitePlanOption[],
	categories: IOptionCategory[]
) : SDPoint[] 
{
	let sDPoints : SDPoint[] = [];

	const selectedBaseHouseOptions: LitePlanOption[] = baseHouseOptions.selectedBaseHouseOptions;
	const selectedBaseHouseChangeOrderOptions = jobChangeOrderPlanOptions.filter(coPlanOption => {
		const option = options.find(option => option.id === coPlanOption.planOptionId &&
			selectedBaseHouseOptions?.find(opt => opt.id === coPlanOption.planOptionId));
		return option;
	});

	// Add selected elevation
	const elevationPlanOptions = jobChangeOrderPlanOptions.filter(coPlanOption => {
		const option = options.find(option => option.id === coPlanOption.planOptionId &&
			!selectedBaseHouseOptions?.find(opt => opt.id === coPlanOption.planOptionId));
		return option?.optionSubCategoryId === Elevation.Detached || option?.optionSubCategoryId === Elevation.Attached;
	});

	if (elevationPlanOptions?.length)
	{
		let elevationColorPoints : SDPoint[] = [];
		let elevationChoices : SDChoice[] = [];
		let colorSchemeChoices : SDChoice[] = [];

		elevationPlanOptions.forEach(coPlanOption => {
			const option = options.find(option => option.id === coPlanOption.planOptionId);
			if (option)
			{
				const elevationChoice = createLiteSDChoice(option.name, option.id, option.description, option.listPrice, coPlanOption.qty);
				elevationChoices.push(elevationChoice);

				if (coPlanOption.jobChangeOrderPlanOptionAttributes?.length)
				{
					coPlanOption.jobChangeOrderPlanOptionAttributes.map(att => {
						const colorSchemeChoice = createLiteSDChoice(att.attributeName, att.id, null, 0, 1);
						colorSchemeChoices.push(colorSchemeChoice);
					});
				}
			}
		});

		// Add Elevation point
		if (!!elevationChoices.length)
		{
			let elevationPoint = createLiteSDPoint(ExteriorLabel.Elevation, elevationChoices);
			elevationPoint.groupName = ExteriorLabel.Exterior;
			elevationPoint.subGroupName = ExteriorLabel.ExteriorSubGroup;

			elevationColorPoints.push(elevationPoint);
		}

		// Add Color Scheme point
		if (!!colorSchemeChoices.length)
		{
			const colorSchemePoint = createLiteSDPoint(ExteriorLabel.ColorScheme, colorSchemeChoices);
			colorSchemePoint.groupName = ExteriorLabel.Exterior;
			colorSchemePoint.subGroupName = ExteriorLabel.ExteriorSubGroup;
	
			elevationColorPoints.push(colorSchemePoint);
		}
		
		sDPoints = sDPoints.concat(elevationColorPoints);
	}

	// Add other selected options FIRST
	const nonElevationPlanOptions = jobChangeOrderPlanOptions.filter(coPlanOption => {
		return !elevationPlanOptions.find(option => option.planOptionId === coPlanOption.planOptionId)
			&& !selectedBaseHouseOptions?.find(opt => opt.id === coPlanOption.planOptionId);
	});

	if (nonElevationPlanOptions?.length)
	{
		let nonElevationPoints: SDPoint[] = [];

		nonElevationPlanOptions?.forEach(coPlanOption => {
			const option = options.find(option => option.id === coPlanOption.planOptionId);

			if (option)
			{
				const category = categories?.find(category => category.id === option.optionCategoryId);
				const subCategory = category?.optionSubCategories?.find(subCategory => subCategory.id === option.optionSubCategoryId);
				const optionChoice = createLiteSDChoice(option.name, option.id, option.description, option.listPrice, coPlanOption.qty, buildLiteOptionColors(option, coPlanOption));
				
				let optionPoint = createLiteSDPoint(option.financialOptionIntegrationKey, [optionChoice]);
				optionPoint.groupName = category?.name;
				optionPoint.subGroupName = subCategory?.name;
	
				nonElevationPoints.push(optionPoint);
			}
		});	

		nonElevationPoints.sort((a, b) => a.subGroupName.localeCompare(b.subGroupName));
		nonElevationPoints.sort((a, b) => a.groupName.localeCompare(b.groupName));
		sDPoints = sDPoints.concat(nonElevationPoints);
	}

	// Add selected base house options LAST
	if (selectedBaseHouseOptions?.length)
	{
		let baseHousePoints: SDPoint[] = [];
		selectedBaseHouseChangeOrderOptions?.forEach(baseHouseOption => {
			const option = options.find(option => option.id === baseHouseOption.planOptionId);

			if (option)
			{
				const category = categories?.find(category => category.id === option.optionCategoryId);
				const optionChoice = createLiteSDChoice(option.name, option.id, option.description, option.listPrice, baseHouseOption.qty, buildLiteOptionColors(option, baseHouseOption));
				
				let optionPoint = createLiteSDPoint(option.financialOptionIntegrationKey, [optionChoice]);
				optionPoint.groupName = category?.name;
				optionPoint.subGroupName = ''; // Do not show sub-category for base house
	
				baseHousePoints.push(optionPoint);
			}
		});

		baseHousePoints.sort((a, b) => a.groupName.localeCompare(b.groupName));
		sDPoints = sDPoints.concat(baseHousePoints);
	}

	return sDPoints;
}

export function getLiteConstructionChangeOrderPdfData(
	options: LitePlanOption[],
	categories: IOptionCategory[],
	jobChangeOrderPlanOptions: ChangeOrderPlanOption[],
	selectedElevation: LitePlanOption
)
{
	let pdfData : any[] = [];

	const elevationPlanOptions = jobChangeOrderPlanOptions.filter(coPlanOption => {
		const option = options.find(option => option.id === coPlanOption.planOptionId);
		return option.optionSubCategoryId === Elevation.Detached || option.optionSubCategoryId === Elevation.Attached;
	});

	if (elevationPlanOptions?.length)
	{
		elevationPlanOptions.forEach(coPlanOption => {
			const option = options.find(option => option.id === coPlanOption.planOptionId);
			if (option)
			{
				if (['Add','Delete'].includes(coPlanOption.action))
				{
					pdfData.push({
						choiceLabel: coPlanOption.optionSalesName,
						decisionPointLabel: coPlanOption.integrationKey,
						dpChoiceCalculatedPrice: coPlanOption.listPrice,
						dpChoiceQuantity: coPlanOption.qty,
						groupLabel: ExteriorLabel.Exterior,
						subgroupLabel: ExteriorLabel.ExteriorSubGroup,
						isColorScheme: false,
						isElevation: true,
						locations: [],
						options: [],
						overrideNote: null,
						dpChoiceId: 0,
						divChoiceCatalogId: coPlanOption.planOptionId, // used for option filtering in API
						attributes: [],
						action: coPlanOption.action
					});
				}

				if (coPlanOption.jobChangeOrderPlanOptionAttributes?.length)
				{
					coPlanOption.jobChangeOrderPlanOptionAttributes.forEach(att => {
						pdfData.push({
							choiceLabel: att.attributeName,
							decisionPointLabel: ExteriorLabel.ColorScheme,
							dpChoiceCalculatedPrice: 0,
							dpChoiceQuantity: 1,
							groupLabel: ExteriorLabel.Exterior,
							subgroupLabel: ExteriorLabel.ExteriorSubGroup,
							isColorScheme: true,
							isElevation: false,
							locations: [],
							options: [],
							overrideNote: null,
							dpChoiceId: 0,
							divChoiceCatalogId: att.id, // used for option filtering in API
							attributes: [],
							action: att.action
						});
					});
				}
			}
		});
	}

	const nonElevationPlanOptions = jobChangeOrderPlanOptions.filter(coPlanOption => {
		return !elevationPlanOptions.find(option => option.planOptionId === coPlanOption.planOptionId);
	});

	if (nonElevationPlanOptions?.length)
	{
		nonElevationPlanOptions?.forEach(coPlanOption => {
			const attributes = coPlanOption.jobChangeOrderPlanOptionAttributes?.length
			? coPlanOption.jobChangeOrderPlanOptionAttributes.map(attr =>
				{
					return {
						attributeGroupCommunityId: 0,
						attributeCommunityId: 0,
						action: attr.action,
						attributeGroupLabel: attr.attributeGroupLabel,
						attributeName: attr.attributeName,
						manufacturer: attr.manufacturer ? attr.manufacturer : null,
						sku: attr.sku ? attr.sku : null,
					};
				}).sort((a, b) => a.attributeGroupLabel.localeCompare(b.attributeGroupLabel))
			: [];

			const option = options.find(opt => opt.id === coPlanOption.planOptionId);
			const optionCategoryName = option 
				? categories.find(cat => cat.id === option.optionCategoryId)?.name
				: '';
			const allSubCategories = _.flatMap(categories, c => c.optionSubCategories) || [];
			const optionSubCategoryName = option 
				? allSubCategories.find(cat => cat.id === option.optionSubCategoryId)?.name
				: '';

				pdfData.push({
				choiceLabel: coPlanOption.optionSalesName,
				decisionPointLabel: coPlanOption.integrationKey,
				dpChoiceCalculatedPrice: coPlanOption.listPrice,
				dpChoiceQuantity: coPlanOption.qty,
				groupLabel: optionCategoryName,
				subgroupLabel: optionSubCategoryName,
				isColorScheme: false,
				isElevation: coPlanOption.planOptionId === selectedElevation.id,
				locations: [],
				options: [],
				overrideNote: null,
				dpChoiceId: 0,
				divChoiceCatalogId: coPlanOption.planOptionId, // used for option filtering in API
				attributes: attributes,
				action: coPlanOption.action
			});
		});		
	}

	return pdfData;
}

// END PHD Lite