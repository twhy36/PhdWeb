import { createSelector, createFeatureSelector } from '@ngrx/store';

import * as _ from "lodash";

import { ScenarioActions, ScenarioActionTypes } from './actions';

import { selectChoice, applyRules, setGroupStatus, setPointStatus, setSubgroupStatus, getMaxSortOrderChoice, findChoice, findPoint } from '../../shared/classes/rulesExecutor';
import { checkSelectedAttributes } from '../../shared/classes/tree.utils';

import { Tree, Choice, Group, SubGroup, DecisionPoint, PickType } from '../../shared/models/tree.model.new';
import { TreeVersionRules } from '../../shared/models/rule.model.new';
import { PlanOption } from '../../shared/models/option.model';
import { Scenario, TreeFilter } from '../../shared/models/scenario.model';
import { SalesCommunity } from '../../shared/models/community.model';
import { DecisionPointFilterType } from '../../shared/models/decisionPointFilter';
import { DesignToolAttribute } from '../../shared/models/attribute.model';

import { RehydrateMap } from '../sessionStorage';
import { CommonActionTypes } from '../actions';

export interface State
{
	buildMode: 'buyer' | 'spec' | 'model' | 'preview';
	enabledPointFilters: DecisionPointFilterType[];
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
	selectedPointFilter: DecisionPointFilterType;
	tree: Tree;
	treeFilter: TreeFilter;
	treeLoading: boolean;
	overrideReason: string;
}

export const initialState: State = {
	tree: null, rules: null, scenario: null, options: null, lotPremium: 0, salesCommunity: null,
	savingScenario: false, saveError: false, isUnsaved: false, treeLoading: false, loadError: false, isGanked: false,
	pointHasChanges: false, buildMode: 'buyer', selectedPointFilter: DecisionPointFilterType.FULL, enabledPointFilters: [],
	monotonyAdvisementShown: false, financialCommunityFilter: 0, treeFilter: null, overrideReason: null
};

RehydrateMap.onRehydrate<State>('scenario', state => { return { ...state, savingScenario: false, saveError: false, treeLoading: false, loadError: false }; });

export function reducer(state: State = initialState, action: ScenarioActions): State
{
	let newTree: Tree;
	let group: Group;
	let subGroup: SubGroup;
	let point: DecisionPoint;
	let choices: Choice[];
	let points: DecisionPoint[];
	let subGroups: SubGroup[];
	let rules: TreeVersionRules;
	let options: PlanOption[];

	switch (action.type)
	{
		case ScenarioActionTypes.LoadTree:
			return { ...state, treeLoading: true, loadError: false };
		case ScenarioActionTypes.LoadError:
			return { ...state, treeLoading: false, loadError: true, tree: null, rules: null };
		case CommonActionTypes.LoadScenario:
			return {
				...state, treeLoading: true, loadError: false
			};
		case ScenarioActionTypes.LoadPreview:
			return { ...state, treeLoading: true, buildMode: 'preview', scenario: <any>{ scenarioId: 0, scenarioName: '--PREVIEW--', scenarioInfo: null } };
		case ScenarioActionTypes.LotConflict:
			return { ...state, isGanked: true };
		case ScenarioActionTypes.TreeLoaded:
		case CommonActionTypes.ScenarioLoaded:
		case CommonActionTypes.SalesAgreementLoaded:
		case ScenarioActionTypes.TreeLoadedFromJob:
		case CommonActionTypes.JobLoaded:
			let newState = {
				tree: _.cloneDeep(action.tree),
				rules: _.cloneDeep(action.rules),
				options: _.cloneDeep(action.options),
				lotPremium: action.lot && action.lot.premium ? action.lot.premium : state.lotPremium,
				salesCommunity: action.salesCommunity,
				treeLoading: false,
				loadError: false
			} as State;

			if (action.type === CommonActionTypes.JobLoaded && !state.scenario)
			{
				newState = { ...newState, buildMode: 'spec', scenario: { opportunityId: 'spec', scenarioName: 'spec', scenarioChoices: [], treeVersionId: 0, planId: 0, lotId: 0, handing: null, viewedDecisionPoints: [], scenarioInfo: null }, enabledPointFilters: [], selectedPointFilter: DecisionPointFilterType.FULL };
			}

			if (action.type === CommonActionTypes.ScenarioLoaded)
			{
				// initialize tree with loaded scenario data
				let scenario = _.cloneDeep(action.scenario);

				scenario.viewedDecisionPoints.forEach(point =>
				{
					let p = _.flatMap(newState.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points))
						.find(pt => point === pt.id);

					if (p)
					{
						p.viewed = true;
					}
				});

				newState = { ...newState, scenario: scenario, isGanked: action.lotNoLongerAvailable, overrideReason: action.overrideReason };
			}

			if (action.type === ScenarioActionTypes.TreeLoadedFromJob || action.type === CommonActionTypes.SalesAgreementLoaded || action.type === CommonActionTypes.JobLoaded)
			{
				if (newState.tree)
				{
					action.choices.forEach(choice =>
					{
						let c = _.flatMap(newState.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)))
							.find(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId);

						if (c)
						{
							// get locations
							let selectedAttributes = choice.jobChoiceLocations ? _.flatten(choice.jobChoiceLocations.map(l =>
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

				let scenario = _.cloneDeep(newState.scenario || state.scenario);

				if ((action.type === ScenarioActionTypes.TreeLoadedFromJob && newState.buildMode !== 'spec' && newState.buildMode !== 'model') || action.type === CommonActionTypes.SalesAgreementLoaded)
				{
					scenario = <any>{ scenarioId: 0, scenarioName: '--PREVIEW--', lotId: action.job.lotId, scenarioInfo: null };
				}
				else
				{
					scenario.lotId = action.job.lotId;
					scenario.planId = action.job.planId;
					scenario.treeVersionId = action.tree ? action.tree.treeVersion.id : null;
				}

				newState = { ...newState, scenario: scenario };
			}

			if (newState.options)
			{
				// apply images to options
				newState.options.forEach(option =>
				{
					let images = action.optionImages.filter(x => x.integrationKey === option.financialOptionIntegrationKey);

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

				// Figure out which Filter Types can be used
				let enabledPointFilters = [];

				enabledPointFilters.push(DecisionPointFilterType.FULL); // default

				if (points.findIndex(x => x.isQuickQuoteItem) >= 0)
				{
					enabledPointFilters.push(DecisionPointFilterType.QUICKQUOTE);
				}

				if (points.findIndex(x => x.isStructuralItem) >= 0)
				{
					enabledPointFilters.push(DecisionPointFilterType.STRUCTURAL);
				}

				if (points.findIndex(x => !x.isStructuralItem) >= 0)
				{
					enabledPointFilters.push(DecisionPointFilterType.DESIGN);
				}

				points.forEach(pt => setPointStatus(pt));
				subGroups.forEach(sg => setSubgroupStatus(sg));
				newState.tree.treeVersion.groups.forEach(g => setGroupStatus(g));

				if (action.type === CommonActionTypes.ScenarioLoaded)
				{
					const optionsDisabled = _.flatMap(newState.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, p => p.choices)))
						.filter(choice => choice.options.some((option) => !option.isActive));
					if (optionsDisabled)
					{
						newTree = newState.tree;
						rules = newState.rules;
						options = newState.options;
						subGroups = _.flatMap(newTree.treeVersion.groups, g => g.subGroups);
						points = _.flatMap(subGroups, sg => sg.points);
						choices = _.flatMap(points, p => p.choices);

						optionsDisabled.forEach(choice =>
						{
							const coJobChoice = action.job && action.job.jobChoices.find(jcChoice => jcChoice.dpChoiceId === choice.id);

							if (coJobChoice)
							{
								if (coJobChoice.dpChoiceQuantity !== choice.quantity)
								{
									choice.quantity = coJobChoice.dpChoiceQuantity;
								}
							}
							else
							{
								if (choice.quantity > 0)
								{
									choice.quantity = 0;
								}
							}

							point = points.find(pt => pt.choices.some(ch => ch.id === choice.id));

							point.completed = point && point.choices && point.choices.some(ch => ch.quantity > 0);
							applyRules(newTree, rules, options);

							// check selected attributes to make sure they're still valid after applying rules
							checkSelectedAttributes(choices);

							points.forEach(pt => setPointStatus(pt));
							subGroups.forEach(sg => setSubgroupStatus(sg));
							newTree.treeVersion.groups.forEach(g => setGroupStatus(g));

						});
					}
				}
				newState = { ...newState, enabledPointFilters: enabledPointFilters, selectedPointFilter: enabledPointFilters[0] };
			}

			return { ...state, ...newState };

		case ScenarioActionTypes.SelectChoices:
			newTree = _.cloneDeep(state.tree);
			rules = _.cloneDeep(state.rules);
			options = _.cloneDeep(state.options);
			subGroups = _.flatMap(newTree.treeVersion.groups, g => g.subGroups);
			points = _.flatMap(subGroups, sg => sg.points);
			choices = _.flatMap(points, p => p.choices);

			for (let choice of action.choices)
			{
				let c = choices.find(ch => ch.id === choice.choiceId);

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

				let pointId = choices.find(ch => ch.id === choice.choiceId).treePointId;

				if (choice.quantity > 0)
				{
					selectChoice(newTree, choice.choiceId);
				}

				choices.find(ch => ch.id === choice.choiceId).overrideNote = choice.overrideNote;
				choices.forEach(ch => (ch.id !== choice.choiceId && ch.treePointId === pointId) ? ch.overrideNote = null : null);

				point = points.find(pt => pt.choices.some(ch => ch.id === choice.choiceId));

				point.completed = point && point.choices && point.choices.some(ch => ch.quantity > 0);
			}

			applyRules(newTree, rules, options);

			// check selected attributes to make sure they're still valid after applying rules
			checkSelectedAttributes(choices);

			points.forEach(pt => setPointStatus(pt));
			subGroups.forEach(sg => setSubgroupStatus(sg));
			newTree.treeVersion.groups.forEach(g => setGroupStatus(g));

			return { ...state, tree: newTree, rules: rules, options: options, isUnsaved: true, pointHasChanges: true };

		case ScenarioActionTypes.CreateScenario:
			return { ...state, scenario: { opportunityId: action.opportunityId, scenarioName: action.scenarioName, scenarioChoices: [], treeVersionId: 0, planId: 0, lotId: 0, handing: null, viewedDecisionPoints: [], scenarioInfo: null }, enabledPointFilters: [], selectedPointFilter: DecisionPointFilterType.FULL };
		case ScenarioActionTypes.SetScenarioPlan:
			return { ...state, scenario: { ...state.scenario, treeVersionId: action.treeVersionId, planId: action.planId } };
		case ScenarioActionTypes.SetScenarioLot:
			return { ...state, scenario: { ...state.scenario, lotId: action.lotId, handing: action.handing }, lotPremium: action.premium, isGanked: false };
		case ScenarioActionTypes.SetScenarioLotHanding:
			return { ...state, scenario: { ...state.scenario, handing: action.handing } };
		case ScenarioActionTypes.SetScenarioName:
			return { ...state, scenario: { ...state.scenario, scenarioName: action.scenarioName } };
		case ScenarioActionTypes.SaveScenario:
			return { ...state, savingScenario: true };
		case ScenarioActionTypes.ScenarioSaved:
			return { ...state, scenario: action.scenario, savingScenario: false, saveError: false, isUnsaved: false };
		case ScenarioActionTypes.SaveError:
			return { ...state, savingScenario: false, saveError: true };
		case ScenarioActionTypes.SetIsFloorplanFlippedScenario:
			return { ...state, savingScenario: true };
		case ScenarioActionTypes.IsFloorplanFlippedScenario:
			const scenario: Scenario = _.cloneDeep(state.scenario);

			scenario.scenarioInfo = scenario.scenarioInfo || { isFloorplanFlipped: false, closingIncentive: 0, designEstimate: 0, discount: 0, homesiteEstimate: 0 };
			scenario.scenarioInfo.isFloorplanFlipped = action.flipped;

			return { ...state, savingScenario: false, scenario: scenario };
		case ScenarioActionTypes.SetPointViewed:
			newTree = _.cloneDeep(state.tree);
			subGroups = _.flatMap(newTree.treeVersion.groups, g => g.subGroups);
			points = _.flatMap(subGroups, sg => sg.points);
			point = points.find(p => p.id === action.pointId);

			point.viewed = true;

			setPointStatus(point);
			subGroup = subGroups.find(sg => sg.points.some(p => p.id === point.id));
			setSubgroupStatus(subGroup);
			setGroupStatus(newTree.treeVersion.groups.find(g => g.subGroups.some(sg => sg.id === subGroup.id)));

			return { ...state, tree: newTree };
		case ScenarioActionTypes.SaveScenarioInfo:
			return { ...state, savingScenario: true };
		case ScenarioActionTypes.ScenarioInfoSaved:
			return { ...state, savingScenario: false, scenario: { ...state.scenario, scenarioInfo: action.scenarioInfo } }
		case ScenarioActionTypes.SetPointTypeFilter:
			return { ...state, selectedPointFilter: action.pointTypeFilter };
		case ScenarioActionTypes.DeleteScenarioInfo:
			return { ...state, scenario: { ...state.scenario, scenarioInfo: null } };
		case ScenarioActionTypes.MonotonyAdvisementShown:
			return { ...state, monotonyAdvisementShown: state.monotonyAdvisementShown };
		case ScenarioActionTypes.SetBuildMode:
			return { ...state, buildMode: action.buildMode, scenario: { opportunityId: action.buildMode, scenarioName: action.buildMode, scenarioChoices: [], treeVersionId: 0, planId: 0, lotId: 0, handing: null, viewedDecisionPoints: [], scenarioInfo: null }, enabledPointFilters: [], selectedPointFilter: DecisionPointFilterType.FULL };
		case ScenarioActionTypes.SetFinancialCommunityFilter:
			return { ...state, financialCommunityFilter: action.financialCommunityId };
		case ScenarioActionTypes.SetTreeFilter:
			return { ...state, treeFilter: action.treeFilter };
		case ScenarioActionTypes.SetOverrideReason:
			return { ...state, overrideReason: action.overrideReason };
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

		let groupsById = {};

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

		let subGroupsById = {};

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

		let pointsById = {};

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

		let choicesById = {};

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

		let pointsByCatalogId = {};

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

		for (let group of state.tree.treeVersion.groups)
		{
			for (let subgroup of group.subGroups)
			{
				for (let dp of subgroup.points)
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

		for (let group of state.tree.treeVersion.groups)
		{
			for (let subgroup of group.subGroups)
			{
				for (let dp of subgroup.points)
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

		for (let group of state.tree.treeVersion.groups)
		{
			for (let subgroup of group.subGroups)
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
	(state) => state.buildMode === 'preview'
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
			let overrideNote = state.choices.find(x => !!x.overrideNote);

			return overrideNote ? overrideNote.id : null
		}
		else
		{
			return null;
		}
	}
)

export const elevationConflictOverride = createSelector(
	elevationDP,
	(state) =>
	{
		if (state)
		{
			let overrideNote = state.choices.find(x => !!x.overrideNote);

			return overrideNote ? overrideNote.id : null
		}
		else
		{
			return null;
		}
	}
)

export const choiceOverrides = createSelector(
	selectScenario,
	(state) =>
	{
		if (!state.tree)
		{
			return null;
		}

		let choiceOverrides = [];

		for (let group of state.tree.treeVersion.groups)
		{
			for (let subgroup of group.subGroups)
			{
				for (let dp of subgroup.points)
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

function getChoicePriceRange(choice: Choice, rules: TreeVersionRules, tree: Tree, treeChoices: Choice[], treePoints: DecisionPoint[], planOptions: PlanOption[]) {
	let maxSortOrderChoices = rules.optionRules.map(opt => {
		return {
			rule: opt,
			maxSortOrderChoice: getMaxSortOrderChoice(tree, opt.choices.filter(c => c.mustHave).map(c => c.id)),
			allChoices: opt.choices.filter(c => c.mustHave).map(c => c.id)
		};
	});

	//find all the choices this one depends on
	//currently an issue getting the nested dependencies
	let getRelevantChoices = (ch: number, existing: number[] = []) => {
		if (existing.indexOf(ch) !== -1) return [];
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
	function* choicePermutations(choices: number[], selections: { choiceId: number, selected: boolean }[] = []): IterableIterator<{ choiceId: number, selected: boolean }[]> {
		if (choices.length === 0) {
			//throw out combinations that violate pick types
			if (treePoints.some(p => (p.pointPickTypeId === PickType.Pick0or1 || p.pointPickTypeId === PickType.Pick1) && selections.filter(s => p.choices.some(c => c.id === s.choiceId && s.selected)).length > 1)) {
				return;
			}

			//throw out combinations that violate choice rule
			if (rules.choiceRules.some(r => {
				let ch = selections.find(s => s.choiceId === r.choiceId);
				if (ch && ch.selected) {
					return !r.rules.some(rule => (rule.ruleType === 1 && rule.choices.every(c1 => {
						//must have rule satisfied if all choices are selected
						let c2 = selections.find(s => s.choiceId === c1);
						return c2 && c2.selected;
					})) || (rule.ruleType === 2 && rule.choices.every(c1 => {
						//must not have satisfied if no choices are selected
						let c2 = selections.find(s => s.choiceId === c1);
						return !c2 || !c2.selected;
					})));
				} else {
					return false; //rule doesn't apply
				}
			})) {
				return;
			}

			//throw out combinations that violate point rule
			if (rules.pointRules.some(r => {
				let point = treePoints.find(p => r.pointId === p.id);
				let ch = selections.find(s => s.selected && point && point.choices.some(c => c.id === s.choiceId));
				if (ch && point) {
					return !r.rules.some(rule => (rule.ruleType === 1 && rule.choices.length && rule.choices.every(c1 => {
						//must have rule satisfied if all choices are selected
						let c2 = selections.find(s => s.choiceId === c1);
						return c2 && c2.selected;
					})) || (rule.ruleType === 2 && rule.choices.length && rule.choices.every(c1 => {
						//must not have satisfied if no choices are selected
						let c2 = selections.find(s => s.choiceId === c1);
						return !c2 || !c2.selected;
					})) || (rule.ruleType === 1 && rule.points.length && rule.points.every(p1 => {
						//must have rule satisfied if all points are selected
						let c2 = selections.find(s => {
							let p2 = treePoints.find(p3 => p3.id === p1);
							return p2 && p2.choices.some(c => c.id === s.choiceId) && s.selected;
						});
						return !!c2;
					})) || (rule.ruleType === 2 && rule.points.length && rule.points.every(p1 => {
						//must not have rule satisfied if no points are selected
						let c2 = selections.find(s => {
							let p2 = treePoints.find(p3 => p3.id === p1);
							return p2 && p2.choices.some(c => c.id === s.choiceId) && s.selected;
						});
						return !c2;
					})));
				} else {
					return false; //rule doesn't apply
				}
			})) {
				return;
			}

			yield selections;
		}
		else {
			yield* choicePermutations(choices.slice(1), [{ choiceId: choices[0], selected: false }, ...selections]);
			yield* choicePermutations(choices.slice(1), [{ choiceId: choices[0], selected: true }, ...selections]);
		}
	}

	var previousChoices = getRelevantChoices(choice.id);
	let min: number = null, max: number = null;

	if (previousChoices.length) {
		for (let perm of choicePermutations(previousChoices)) {
			treeChoices.forEach(c => {
				c.quantity = 0;
				c.enabled = true;
			});

			treePoints.forEach(p => {
				p.enabled = true;
				p.completed = false;
			});

			for (let p of [...perm]) {
				let ch = findChoice(tree, c => c.id === p.choiceId);

				if (p.selected) {
					ch.quantity = 1;
					findPoint(tree, p => p.id === ch.treePointId).completed = true;
				}
			}

			applyRules(tree, rules, planOptions);

			let clonedChoice = findChoice(tree, c => c.id === choice.id);

			if (clonedChoice.enabled && findPoint(tree, p => p.id === choice.treePointId).enabled) {
				if (min === null || min > clonedChoice.price) {
					min = clonedChoice.price;
				}

				if (max === null || max < clonedChoice.price) {
					max = clonedChoice.price;
				}
			}
		}
	}
	else {
		//may not have to apply rules in this case; could possible look at just the option mappings. But this should be a smaller part of the overall
		//computation so I'll leave it as-is for now.
		treeChoices.forEach(c => {
			c.quantity = 0;
			c.enabled = true;
		});

		treePoints.forEach(p => {
			p.enabled = true;
			p.completed = false;
		});

		applyRules(tree, rules, planOptions);

		let clonedChoice = treeChoices.find(ch => ch.id === choice.id);

		if (min === null || min > clonedChoice.price) {
			min = clonedChoice.price;
		}

		if (max === null || max < clonedChoice.price) {
			max = clonedChoice.price;
		}
	}

	return { min, max };
}

export const choicePriceRangeByChoice = createSelector(
	selectScenario,
	(state, props) => {
		if (!state.options || !state.rules || !state.tree)
		{
			return;
		}

		let staticTree = _.cloneDeep(state.tree);
		let rules = _.cloneDeep(state.rules);
		let options = _.cloneDeep(state.options);
		let points = _.flatMap(staticTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
		let choices = _.flatMap(points, p => p.choices);
		let choice = choices.find(c => c.id === props.choiceId);

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

		let staticTree = _.cloneDeep(state.tree);
		let rules = _.cloneDeep(state.rules);
		let options = _.cloneDeep(state.options);
		let points = _.flatMap(staticTree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
		let choices = _.flatMap(points, p => p.choices);

		return choices.map(choice =>
		{
			let { min, max } = getChoicePriceRange(choice, rules, staticTree, choices, points, options);

			return {
				choiceId: choice.id,
				min,
				max
			};
		});
	}
);
