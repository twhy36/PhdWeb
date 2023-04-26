import { createSelector, createFeatureSelector } from '@ngrx/store';

import * as _ from 'lodash';

import
{
	applyRules, getMaxSortOrderChoice, findChoice, findPoint, selectChoice,
	DesignToolAttribute, SalesCommunity, PlanOption, TreeVersionRules, Scenario, TreeFilter,
	Tree, Choice, Group, SubGroup, DecisionPoint, PickType, setPointStatus, setSubgroupStatus, setGroupStatus, PointStatus, FloorPlanImage
} from 'phd-common';

import { checkSelectedAttributes, hideChoicesByStructuralItems, hidePointsByStructuralItems } from '../../shared/classes/tree.utils';
import { RehydrateMap } from '../sessionStorage';
import { CommonActionTypes } from '../actions';
import { ScenarioActions, ScenarioActionTypes } from './actions';
import { BuildMode } from '../../shared/models/build-mode.model';

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
}

export const initialState: State = {
	tree: null, rules: null, scenario: null, options: null, lotPremium: 0, salesCommunity: null,
	savingScenario: false, saveError: false, isUnsaved: false, treeLoading: false, loadError: false, isGanked: false,
	pointHasChanges: false, buildMode: BuildMode.Buyer,
	monotonyAdvisementShown: false, financialCommunityFilter: 0, treeFilter: null, overrideReason: null,
	hiddenChoiceIds: [], hiddenPointIds: [], floorPlanImages: []
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

			for (const choice of action.choices)
			{
				const c = choices.find(ch => ch.id === choice.choiceId || ch.divChoiceCatalogId === choice.divChoiceCatalogId);
				if (c)
				{
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

			points.forEach(point =>
			{
				point.completed = point && point.choices && point.choices.some(ch => ch.quantity > 0);
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

function getChoicePriceRange(choice: Choice, rules: TreeVersionRules, tree: Tree, treeChoices: Choice[], treePoints: DecisionPoint[], planOptions: PlanOption[])
{
	const maxSortOrderChoices = rules.optionRules.map(opt =>
	{
		return {
			rule: opt,
			maxSortOrderChoice: getMaxSortOrderChoice(tree, opt.choices.filter(c => c.mustHave).map(c => c.id)),
			allChoices: opt.choices.filter(c => c.mustHave).map(c => c.id)
		};
	});

	//find all the choices this one depends on
	//currently an issue getting the nested dependencies
	const getRelevantChoices = (ch: number, existing: number[] = []) =>
	{
		if (existing.indexOf(ch) !== -1)
		{
			return [];
		}

		var currentChoice = treeChoices.find(c => c.id === ch);
		var previousChoices = [
			..._.flatten(rules.choiceRules.filter(r => r.choiceId === ch).map(r => _.flatMap(r.rules, r1 => r1.choices))),
			..._.flatten(rules.pointRules.filter(r => currentChoice.treePointId === r.pointId).map(r => _.flatMap(r.rules, r1 => r1.choices && r1.choices.length ? r1.choices : _.flatMap(treePoints.filter(pt => r1.points.some(p => p === pt.id)), p => p.choices[0].id)))),
			..._.flatten(maxSortOrderChoices.filter(c => c.maxSortOrderChoice === ch).map(c => c.allChoices.filter(c1 => c1 !== ch)))
		];

		previousChoices.push(..._.flatten(previousChoices.map(c => getRelevantChoices(c, [ch, ...existing]))));

		return _.uniq(previousChoices);
	};

	//make an iterable with each possible choice selection
	function* choicePermutations(choices: number[], selections: { choiceId: number, selected: boolean }[] = []): IterableIterator<{ choiceId: number, selected: boolean }[]>
	{
		if (choices.length === 0)
		{
			//throw out combinations that violate pick types
			if (treePoints.some(p => (p.pointPickTypeId === PickType.Pick0or1 || p.pointPickTypeId === PickType.Pick1) && selections.filter(s => p.choices.some(c => c.id === s.choiceId && s.selected)).length > 1))
			{
				return;
			}

			//throw out combinations that violate choice rule
			if (rules.choiceRules.some(r =>
			{
				const ch = selections.find(s => s.choiceId === r.choiceId);

				if (ch && ch.selected)
				{
					return !r.rules.some(rule => (rule.ruleType === 1 && rule.choices.every(c1 =>
					{
						//must have rule satisfied if all choices are selected
						const c2 = selections.find(s => s.choiceId === c1);

						return c2 && c2.selected;
					})) || (rule.ruleType === 2 && rule.choices.every(c1 =>
					{
						//must not have satisfied if no choices are selected
						const c2 = selections.find(s => s.choiceId === c1);

						return !c2 || !c2.selected;
					})));
				}
				else
				{
					return false; //rule doesn't apply
				}
			}))
			{
				return;
			}

			//throw out combinations that violate point rule
			if (rules.pointRules.some(r =>
			{
				const point = treePoints.find(p => r.pointId === p.id);
				const ch = selections.find(s => s.selected && point && point.choices.some(c => c.id === s.choiceId));

				if (ch && point)
				{
					return !r.rules.some(rule => (rule.ruleType === 1 && rule.choices.length && rule.choices.every(c1 =>
					{
						//must have rule satisfied if all choices are selected
						const c2 = selections.find(s => s.choiceId === c1);

						return c2 && c2.selected;
					})) || (rule.ruleType === 2 && rule.choices.length && rule.choices.every(c1 =>
					{
						//must not have satisfied if no choices are selected
						const c2 = selections.find(s => s.choiceId === c1);

						return !c2 || !c2.selected;
					})) || (rule.ruleType === 1 && rule.points.length && rule.points.every(p1 =>
					{
						//must have rule satisfied if all points are selected
						const c2 = selections.find(s =>
						{
							const p2 = treePoints.find(p3 => p3.id === p1);

							return p2 && p2.choices.some(c => c.id === s.choiceId) && s.selected;
						});

						return !!c2;
					})) || (rule.ruleType === 2 && rule.points.length && rule.points.every(p1 =>
					{
						//must not have rule satisfied if no points are selected
						const c2 = selections.find(s =>
						{
							const p2 = treePoints.find(p3 => p3.id === p1);

							return p2 && p2.choices.some(c => c.id === s.choiceId) && s.selected;
						});

						return !c2;
					})));
				}
				else
				{
					return false; //rule doesn't apply
				}
			}))
			{
				return;
			}

			yield selections;
		}
		else
		{
			yield* choicePermutations(choices.slice(1), [{ choiceId: choices[0], selected: false }, ...selections]);
			yield* choicePermutations(choices.slice(1), [{ choiceId: choices[0], selected: true }, ...selections]);
		}
	}

	var previousChoices = getRelevantChoices(choice.id);
	let min: number = null, max: number = null;

	if (previousChoices.length)
	{
		for (const perm of choicePermutations(previousChoices))
		{
			treeChoices.forEach(c =>
			{
				c.quantity = 0;
				c.enabled = true;
			});

			treePoints.forEach(p =>
			{
				p.enabled = true;
				p.completed = false;
			});

			for (const p of [...perm])
			{
				const ch = findChoice(tree, c => c.id === p.choiceId);

				if (p.selected)
				{
					ch.quantity = 1;
					findPoint(tree, p => p.id === ch.treePointId).completed = true;
				}
			}

			applyRules(tree, rules, planOptions);

			const clonedChoice = findChoice(tree, c => c.id === choice.id);

			if (clonedChoice.enabled && findPoint(tree, p => p.id === choice.treePointId).enabled)
			{
				if (min === null || min > clonedChoice.price)
				{
					min = clonedChoice.price;
				}

				if (max === null || max < clonedChoice.price)
				{
					max = clonedChoice.price;
				}
			}
		}
	}
	else
	{
		//may not have to apply rules in this case; could possible look at just the option mappings. But this should be a smaller part of the overall
		//computation so I'll leave it as-is for now.
		treeChoices.forEach(c =>
		{
			c.quantity = 0;
			c.enabled = true;
		});

		treePoints.forEach(p =>
		{
			p.enabled = true;
			p.completed = false;
		});

		applyRules(tree, rules, planOptions);

		const clonedChoice = treeChoices.find(ch => ch.id === choice.id);

		if (min === null || min > clonedChoice.price)
		{
			min = clonedChoice.price;
		}

		if (max === null || max < clonedChoice.price)
		{
			max = clonedChoice.price;
		}
	}

	return { min, max };
}

export const choicePriceRangeByChoice = createSelector(
	selectScenario,
	(state, props) =>
	{
		if (!state.options || !state.rules || !state.tree)
		{
			return;
		}

		const staticTree = _.cloneDeep(state.tree);
		const rules = _.cloneDeep(state.rules);
		const options = _.cloneDeep(state.options);
		const points = _.flatMap(staticTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
		const choices = _.flatMap(points, p => p.choices);
		const choice = choices.find(c => c.id === props.choiceId);

		return getChoicePriceRange(choice, rules, staticTree, choices, points, options);
	});

export const choicePriceRanges = createSelector(
	selectScenario,
	(state) =>
	{
		if (!state.options || !state.rules || !state.tree)
		{
			return;
		}

		const staticTree = _.cloneDeep(state.tree);
		const rules = _.cloneDeep(state.rules);
		const options = _.cloneDeep(state.options);
		const points = _.flatMap(staticTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
		const choices = _.flatMap(points, p => p.choices);

		return choices.map(choice =>
		{
			const { min, max } = getChoicePriceRange(choice, rules, staticTree, choices, points, options);

			return {
				choiceId: choice.id,
				min,
				max
			};
		});
	}
);

export const floorPlanImages = createSelector(
	selectScenario,
	(state) => state.floorPlanImages
);
