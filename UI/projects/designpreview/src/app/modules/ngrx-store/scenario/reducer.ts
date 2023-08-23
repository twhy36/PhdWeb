import { createSelector, createFeatureSelector } from '@ngrx/store';

import * as _ from 'lodash';

import
{
	applyRules, selectChoice,
	DesignToolAttribute, SalesCommunity, PlanOption, TreeVersionRules, Scenario, TreeFilter,
	Tree, Choice, Group, SubGroup, DecisionPoint, PickType, setPointStatus, setSubgroupStatus, setGroupStatus, PointStatus, FloorPlanImage, ChoicePriceRange
} from 'phd-common';

import { checkSelectedAttributes, hideChoicesByStructuralItems, hidePointsByStructuralItems } from '../../shared/classes/tree.utils';
import { RehydrateMap } from '../sessionStorage';
import { CommonActionTypes } from '../actions';
import { ScenarioActions, ScenarioActionTypes } from './actions';
import { BuildMode } from '../../shared/models/build-mode.model';
import { CurrentAttribute } from '../../shared/models/current-attribute.model';

export interface State
{
	buildMode: BuildMode;
	financialCommunityFilter: number;
	isGanked: boolean;
	isUnsaved: boolean;
	loadError: boolean;
	lotPremium: number;
	monotonyAdvisementShown: boolean;
	options: PlanOption[];
	pointHasChanges: boolean;
	rules: TreeVersionRules;
	salesCommunity: SalesCommunity;
	saveError: boolean;
	savingScenario: boolean;
	scenario: Scenario;
	tree: Tree;
	treeFilter: TreeFilter;
	treeLoading: boolean;
	overrideReason: string;
	hiddenChoiceIds: number[];
	hiddenPointIds: number[];
	floorPlanImages: FloorPlanImage[];
	presalePricingEnabled: boolean;
	priceRanges: ChoicePriceRange[];
	currentAttribute: CurrentAttribute;
}

export const initialState: State = {
	tree: null, rules: null, scenario: null, options: null, lotPremium: 0, salesCommunity: null,
	savingScenario: false, saveError: false, isUnsaved: false, treeLoading: false, loadError: false, isGanked: false,
	pointHasChanges: false, buildMode: BuildMode.Buyer,
	monotonyAdvisementShown: false, financialCommunityFilter: 0, treeFilter: null, overrideReason: null,
	hiddenChoiceIds: [], hiddenPointIds: [], floorPlanImages: [], presalePricingEnabled: false, priceRanges: null, currentAttribute: null
};

RehydrateMap.onRehydrate<State>('scenario', state => { return { ...state, savingScenario: false, saveError: false, treeLoading: false, loadError: false }; });

export function reducer(state: State = initialState, action: ScenarioActions): State
{
	let newTree: Tree;
	let choices: Choice[];
	let points: DecisionPoint[];
	let subGroups: SubGroup[];
	let rules: TreeVersionRules;
	let options: PlanOption[];

	switch (action.type)
	{
		case CommonActionTypes.SalesAgreementLoaded:
		case ScenarioActionTypes.TreeLoaded:
			let newState = {
				tree: _.cloneDeep(action.tree),
				rules: _.cloneDeep(action.rules),
				options: _.cloneDeep(action.options),
				lotPremium: action.lot && action.lot.premium ? action.lot.premium : state.lotPremium,
				salesCommunity: action.salesCommunity,
				treeLoading: false,
				loadError: false,
				hiddenChoiceIds: [],
				hiddenPointIds: [],
				floorPlanImages: []
			} as State;

			if (action.type === CommonActionTypes.SalesAgreementLoaded)
			{
				if (newState.tree)
				{
					action.choices.forEach(choice =>
					{
						const c = _.flatMap(newState.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)))
							.find(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId);

						if (c)
						{
							// get locations
							const selectedAttributes = choice.jobChoiceLocations ? _.flatten(choice.jobChoiceLocations.map(l =>
							{
								return l.jobChoiceLocationAttributes && l.jobChoiceLocationAttributes.length ? l.jobChoiceLocationAttributes.map(a =>
								{
									return <DesignToolAttribute>{
										attributeId: a.attributeCommunityId,
										attributeGroupId: a.attributeGroupCommunityId,
										scenarioChoiceLocationId: a.id,
										scenarioChoiceLocationAttributeId: l.id,
										locationGroupId: l.locationGroupCommunityId,
										locationId: l.locationCommunityId,
										locationQuantity: l.quantity,
										attributeGroupLabel: a.attributeGroupLabel,
										attributeName: a.attributeName,
										locationGroupLabel: l.locationGroupLabel,
										locationName: l.locationName,
										sku: a.sku,
										manufacturer: a.manufacturer
									};
								}) : [<DesignToolAttribute>{
									locationGroupId: l.locationGroupCommunityId,
									locationGroupLabel: l.locationGroupLabel,
									locationId: l.locationCommunityId,
									locationName: l.locationName,
									locationQuantity: l.quantity
								}];
							})) : [];

							// get attributes
							c.selectedAttributes && choice.jobChoiceAttributes && choice.jobChoiceAttributes.forEach(a =>
							{
								selectedAttributes.push({
									attributeId: a.attributeCommunityId,
									attributeGroupId: a.attributeGroupCommunityId,
									scenarioChoiceLocationId: a.id,
									attributeGroupLabel: a.attributeGroupLabel,
									attributeName: a.attributeName,
									sku: a.sku,
									manufacturer: a.manufacturer
								} as DesignToolAttribute);
							});

							c.quantity = choice.dpChoiceQuantity;
							c.selectedAttributes = selectedAttributes;
						}
					});
				}

				const scenario = { scenarioId: 0, scenarioName: '--PREVIEW--', lotId: action.job.lotId, scenarioInfo: null } as Scenario;

				newState = { ...newState, scenario: scenario };
			}

			if (newState.options)
			{
				// apply images to options
				newState.options.forEach(option =>
				{
					const images = action.optionImages.filter(x => x.integrationKey === option.financialOptionIntegrationKey);

					if (images.length)
					{
						// make sure they're sorted properly
						option.optionImages = images.sort((a, b) => a.sortKey < b.sortKey ? -1 : 1);
					}
				});
			}

			if (newState.tree)
			{
				_.flatMap(newState.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points))
					.forEach(pt => pt.completed = pt.choices.some(c => c.quantity > 0));

				applyRules(newState.tree, newState.rules, newState.options);
				subGroups = _.flatMap(newState.tree.treeVersion.groups, g => g.subGroups);
				points = _.flatMap(subGroups, sg => sg.points);
				choices = _.flatMap(points, p => p.choices);

				if (action.type === CommonActionTypes.SalesAgreementLoaded && action.info?.isDesignComplete)
				{
					// When it is design complete, all points and subgroups should be in complete status
					points.forEach(pt =>
					{
						pt.status = PointStatus.COMPLETED;
						pt.completed = true;
					});

					subGroups.forEach(sg => sg.status = PointStatus.COMPLETED);
				}
				else
				{
					points.forEach(pt => setPointStatus(pt));

					if (action.type === CommonActionTypes.SalesAgreementLoaded)
					{
						// For each point, if the user cannot select the DP in this tool, then the status should be complete
						points.filter(pt => pt.isStructuralItem || pt.isPastCutOff || pt.isHiddenFromBuyerView)
							.forEach(pt => pt.status = PointStatus.COMPLETED);
					}

					// For each point with a pick 0, we need to change the status to required (if no thanks is selected, the status is later updated to Completed)
					points.filter(pt =>
						[PickType.Pick0or1, PickType.Pick0ormore].indexOf(pt.pointPickTypeId) > 0
						&& [PointStatus.UNVIEWED, PointStatus.VIEWED].indexOf(pt.status) > 0
					).forEach(pt => pt.status = PointStatus.REQUIRED);

					subGroups.forEach(sg => setSubgroupStatus(sg));
				}

				newState.tree.treeVersion.groups.forEach(g => setGroupStatus(g));

				// Choice-To-Choice
				hideChoicesByStructuralItems(newState.rules.choiceRules, choices, points, newState.hiddenChoiceIds, newState.hiddenPointIds);

				// Point-To-Choice && Point-To-Point
				hidePointsByStructuralItems(newState.rules.pointRules, choices, points, newState.hiddenChoiceIds, newState.hiddenPointIds);
			}

			return { ...state, ...newState };

		case ScenarioActionTypes.SetTreeFilter:
			return { ...state, treeFilter: action.treeFilter };

		case ScenarioActionTypes.SelectChoices:

			newTree = _.cloneDeep(state.tree);
			rules = _.cloneDeep(state.rules);
			options = _.cloneDeep(state.options);
			subGroups = _.flatMap(newTree.treeVersion.groups, g => g.subGroups);
			points = _.flatMap(subGroups, sg => sg.points);
			choices = _.flatMap(points, p => p.choices);

			const hiddenAlert: HTMLElement = document.getElementById('hiddenAlert');

			if (hiddenAlert) 
			{
				hiddenAlert.innerHTML = '';
			}

			for (const choice of action.choices)
			{
				const c = choices.find(ch => ch.id === choice.choiceId || ch.divChoiceCatalogId === choice.divChoiceCatalogId);
				if (c)
				{
					//selection changed from attribute or attributes cleared by un-favorite
					if (choice.attributes?.length && ((!c.quantity && choice.quantity) || (c.quantity && !choice.quantity)))
					{
						if (hiddenAlert) 
						{
							hiddenAlert.innerHTML = 'Updating this element will cause content on the page to be updated.';
						}
					}

					c.quantity = choice.quantity;

					if (choice.attributes)
					{
						if (choice.attributes.length)
						{
							c.selectedAttributes = [];

							choice.attributes.forEach(actionAttribute =>
							{
								c.selectedAttributes.push({
									attributeId: actionAttribute.attributeId,
									attributeName: actionAttribute.attributeName,
									attributeImageUrl: actionAttribute.attributeImageUrl,
									attributeGroupId: actionAttribute.attributeGroupId,
									attributeGroupName: actionAttribute.attributeGroupName,
									attributeGroupLabel: actionAttribute.attributeGroupLabel,
									locationGroupId: actionAttribute.locationGroupId,
									locationGroupLabel: actionAttribute.locationGroupLabel,
									locationGroupName: actionAttribute.locationGroupName,
									locationId: actionAttribute.locationId,
									locationName: actionAttribute.locationName,
									locationQuantity: actionAttribute.locationQuantity,
									scenarioChoiceLocationId: null,
									scenarioChoiceLocationAttributeId: null,
									sku: actionAttribute.sku,
									manufacturer: actionAttribute.manufacturer
								});
							});
						}
						else
						{
							c.selectedAttributes = [];
						}
					}

					if (c.quantity === 0)
					{
						c.lockedInOptions = [];
						c.lockedInChoice = null;
					}
				}

				if (choice.quantity > 0)
				{
					selectChoice(newTree, choice.choiceId);
				}
			}

			if (hiddenAlert) 
			{
				hiddenAlert.innerHTML = '';
			}
			points.forEach(point =>
			{
				const initPointCompleted = point.completed;
				point.completed = point && point.choices && point.choices.some(ch => ch.quantity > 0);

				//related point updated per select choice, raise aria warning
				if (initPointCompleted !== point.completed)
				{
					if (hiddenAlert) 
					{
						hiddenAlert.innerHTML = 'Updating this element will cause content on the page to be updated.';
					}
				}
			});
			applyRules(newTree, rules, options);

			// check selected attributes to make sure they're still valid after applying rules
			checkSelectedAttributes(choices);

			if (action.isDesignComplete)
			{
				// When it is design complete, all points and subgroups should be in complete status
				points.forEach(pt =>
				{
					pt.status = PointStatus.COMPLETED;
					pt.completed = true;
				});
				subGroups.forEach(sg => sg.status = PointStatus.COMPLETED);
			}
			else
			{
				points.forEach(pt => setPointStatus(pt));

				// For each point, if the user cannot select the DP in this tool, then the status should be complete
				if (state.buildMode === BuildMode.Preview || state.buildMode === BuildMode.Presale)
				{
					points.filter(pt => pt.isHiddenFromBuyerView)
						.forEach(pt => pt.status = PointStatus.COMPLETED);
				}
				else
				{
					points.filter(pt => pt.isStructuralItem || pt.isPastCutOff || pt.isHiddenFromBuyerView)
						.forEach(pt => pt.status = PointStatus.COMPLETED);
				}

				// For each point with a pick 0, we need to change the status to required (if no thanks is selected, the status is later updated to Completed)
				points.filter(pt =>
					[PickType.Pick0or1, PickType.Pick0ormore].indexOf(pt.pointPickTypeId) > -1
					&& [PointStatus.UNVIEWED, PointStatus.VIEWED].indexOf(pt.status) > -1
				).forEach(pt => pt.status = PointStatus.REQUIRED);

				subGroups.forEach(sg => setSubgroupStatus(sg));
			}

			newTree.treeVersion.groups.forEach(g => setGroupStatus(g));

			return { ...state, tree: newTree, rules: rules, options: options, isUnsaved: true, pointHasChanges: true };

		case ScenarioActionTypes.SetStatusForPointsDeclined:
			newTree = _.cloneDeep(state.tree);
			subGroups = _.flatMap(newTree.treeVersion.groups, g => g.subGroups);
			points = _.flatMap(subGroups, sg => sg.points);

			action.divPointCatalogIds?.forEach(id =>
			{
				const point = points.find(x => x.divPointCatalogId === id);
				if (point)
				{
					point.completed = !action.removed;
					point.status = action.removed ? PointStatus.REQUIRED : PointStatus.COMPLETED;
				}
			});

			subGroups.forEach(sg => setSubgroupStatus(sg));
			newTree.treeVersion.groups.forEach(g => setGroupStatus(g));

			return { ...state, tree: newTree };

		case ScenarioActionTypes.LoadPreview:
			return { ...state, treeLoading: true, buildMode: BuildMode.Preview, scenario: { scenarioId: 0, scenarioName: '--PREVIEW--', scenarioInfo: null } as Scenario };

		case ScenarioActionTypes.LoadPresale:
			return { ...state, treeLoading: true, buildMode: BuildMode.Presale, scenario: { scenarioId: 0, scenarioName: '--PRESALE--', scenarioInfo: null } as Scenario };

		case CommonActionTypes.LoadError:
			return { ...state, loadError: true };

		//default to PostContract, only set to PostContract Preview when flag set in action
		case CommonActionTypes.LoadSalesAgreement:
			let newBuildMode = BuildMode.Buyer;
			if (action.isBuyerPreview)
			{
				newBuildMode = BuildMode.BuyerPreview;
			}
			return { ...state, buildMode: newBuildMode };

		case CommonActionTypes.MyFavoritesChoiceAttributesDeleted:
		{
			newTree = _.cloneDeep(state.tree);
			choices = _.flatMap(newTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));
			const choice = choices?.find(c => c.divChoiceCatalogId === action.myFavoritesChoice?.divChoiceCatalogId);

			if (choice)
			{
				const deletedAttributes = [...action.attributes, ...action.locations];
				deletedAttributes?.forEach(att =>
				{
					const attributeIndex = choice.selectedAttributes?.findIndex(selAtt =>
						att.locationGroupId === selAtt.locationGroupId
							&& att.locationId === selAtt.locationId
							&& att.attributeGroupId === selAtt.attributeGroupId
							&& att.attributeId === selAtt.attributeId
					);

					if (attributeIndex > -1)
					{
						choice.selectedAttributes.splice(attributeIndex, 1);
					}
				});
			}

			return { ...state, tree: newTree };
		}

		case ScenarioActionTypes.SetPresalePricingEnabled:
		{
			return { ...state, presalePricingEnabled: action.isEnabled };
		}

		case ScenarioActionTypes.SetChoicePriceRanges:
			return { ...state, priceRanges: action.priceRanges };
			
		case ScenarioActionTypes.CurrentAttribute:
			return { ...state, currentAttribute: action.curAttribute };

		default:
			return state;
	}
}

export const selectScenario = createFeatureSelector<State>('scenario');

export const getGroupsById = createSelector(
	selectScenario,
	(state) =>
	{
		if (!state.tree)
		{
			return null;
		}

		const groupsById = {};

		_.forEach(state.tree.treeVersion.groups, (g: Group) =>
		{
			if (!groupsById[g.id])
			{
				groupsById[g.id] = g;
			}
			else
			{
				console.error('Duplicate Group Id', g.id);
			}
		});

		return groupsById;

	}
);

export const getSubGroupsById = createSelector(
	selectScenario,
	getGroupsById,
	(state, groupsById) =>
	{
		if (!state.tree)
		{
			return null;
		}

		const subGroupsById = {};

		_.forEach(groupsById, (g: Group) => _.forEach(g.subGroups, (sg: SubGroup) =>
		{
			if (!subGroupsById[sg.id])
			{
				subGroupsById[sg.id] = sg;
			}
			else
			{
				console.error('Duplicate SubGroup Id', sg.id);
			}
		}));

		return subGroupsById;

	}
);

export const getPointsById = createSelector(
	selectScenario,
	getSubGroupsById,
	(state, subGroupsById) =>
	{
		if (!state.tree)
		{
			return null;
		}

		const pointsById = {};

		_.forEach(subGroupsById, (sg: SubGroup) => _.flatMap(sg.points, pt =>
		{
			if (!pointsById[pt.id])
			{
				pointsById[pt.id] = pt;
			}
			else
			{
				console.error('Duplicate Points Id', pt.id);
			}
		}));

		return pointsById;
	}
);

export const getChoicesById = createSelector(
	selectScenario,
	getPointsById,
	(state, pointsById) =>
	{
		if (!state.tree)
		{
			return null;
		}

		const choicesById = {};

		_.forEach(pointsById, (p: DecisionPoint) => _.forEach(p.choices, c =>
		{
			if (!choicesById[c.id])
			{
				choicesById[c.id] = c;
			}
			else
			{
				console.error('Duplicate Choice Id', c.id);
			}
		}))

		return choicesById;
	}
);

export const getPointsByCatalogId = createSelector(
	selectScenario,
	getPointsById,
	(state, pointsById) =>
	{
		if (!state.tree)
		{
			return null;
		}

		const pointsByCatalogId = {};

		_.forEach(pointsById, (pt: DecisionPoint) =>
		{
			if (!pointsByCatalogId[pt.divPointCatalogId])
			{
				pointsByCatalogId[pt.divPointCatalogId] = pt;
			}
			else
			{
				console.error('Duplicate Point Catalog Id', pt.id);
			}
		});
		return pointsByCatalogId;
	}
);

export const elevationDP = createSelector(
	selectScenario,
	(state) =>
	{
		if (!state || !state.tree)
		{
			return null;
		}

		for (const group of state.tree.treeVersion.groups)
		{
			for (const subgroup of group.subGroups)
			{
				for (const dp of subgroup.points)
				{
					if (dp.dPointTypeId === 1)
					{
						return dp;
					}
				}
			}
		}

		return null;
	}
);

export const colorSchemeDP = createSelector(
	selectScenario,
	(state) =>
	{
		if (!state.tree)
		{
			return null;
		}

		for (const group of state.tree.treeVersion.groups)
		{
			for (const subgroup of group.subGroups)
			{
				for (const dp of subgroup.points)
				{
					if (dp.dPointTypeId === 2)
					{
						return dp;
					}
				}
			}
		}

		return null;
	}
);

export const interactiveFloorplanSG = createSelector(
	selectScenario,
	(state) =>
	{
		if (!state.tree)
		{
			return null;
		}

		for (const group of state.tree.treeVersion.groups)
		{
			for (const subgroup of group.subGroups)
			{
				if (subgroup.useInteractiveFloorplan)
				{
					return subgroup;
				}
			}
		}

		return null;
	}
);

export const isPreview = createSelector(
	selectScenario,
	(state) => state.buildMode === BuildMode.Preview
);

export const isPresale = createSelector(
	selectScenario,
	(state) => state.buildMode === BuildMode.Presale
);

export const hasMonotonyAdvisement = createSelector(
	selectScenario,
	(state) => state.monotonyAdvisementShown
);

export const buildMode = createSelector(
	selectScenario,
	(state) => state.buildMode
);

export const scenarioHasSalesAgreement = createSelector(
	selectScenario,
	(state) => state.scenario && !!state.scenario.salesAgreementId
);

export const colorSchemeConflictOverride = createSelector(
	colorSchemeDP,
	(state) =>
	{
		if (state)
		{
			const overrideNote = state.choices.find(x => !!x.overrideNote);

			return overrideNote ? overrideNote.id : null
		}
		else
		{
			return null;
		}
	}
);

export const elevationConflictOverride = createSelector(
	elevationDP,
	(state) =>
	{
		if (state)
		{
			const overrideNote = state.choices.find(x => !!x.overrideNote);

			return overrideNote ? overrideNote.id : null
		}
		else
		{
			return null;
		}
	}
);

export const choiceOverrides = createSelector(
	selectScenario,
	(state) =>
	{
		if (!state.tree)
		{
			return null;
		}

		const choiceOverrides = [];

		for (const group of state.tree.treeVersion.groups)
		{
			for (const subgroup of group.subGroups)
			{
				for (const dp of subgroup.points)
				{
					dp.choices.forEach(choice =>
					{
						if (choice.overrideNote)
						{
							choiceOverrides.push(choice.id)
						}
					});
				}
			}
		}

		return choiceOverrides;
	}
);

export const floorPlanImages = createSelector(
	selectScenario,
	(state) => state.floorPlanImages
);

export const presalePricingEnabled = createSelector(
	selectScenario,
	(state) => state.presalePricingEnabled
);

export const choicePriceRanges = createSelector(
	selectScenario,
	(state) =>
	{
		return state.priceRanges;
	}
);


export const getCurrentAttribute = createSelector(
	selectScenario,
	(state) =>
	{
		return state.currentAttribute;
	}
);
