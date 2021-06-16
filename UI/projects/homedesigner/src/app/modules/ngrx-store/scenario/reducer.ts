import { createSelector, createFeatureSelector } from '@ngrx/store';

import * as _ from "lodash";

import {
	applyRules, getMaxSortOrderChoice, findChoice, findPoint,
	PlanOption, TreeVersionRules,
	Tree, Choice, Group, SubGroup, DecisionPoint, PickType, setSubgroupStatus, setGroupStatus, PointStatus, 
	CommonActionTypes, CommonScenarioActionTypes, commonScenarioReducer, IScenarioState
} from 'phd-common';

import { hideChoicesByStructuralItems, hidePointsByStructuralItems } from '../../shared/classes/tree.utils';
import { RehydrateMap } from '../sessionStorage';
import { ScenarioActions, ScenarioActionTypes } from './actions';

export interface State extends IScenarioState
{
	hiddenChoiceIds: number[];
	hiddenPointIds: number[];
}

export const initialState: State = {
	tree: null, rules: null, scenario: null, options: null, lotPremium: 0, salesCommunity: null,
	savingScenario: false, saveError: false, isUnsaved: false, treeLoading: false, loadError: false, isGanked: false,
	pointHasChanges: false, buildMode: 'buyer',
	monotonyAdvisementShown: false, financialCommunityFilter: 0, treeFilter: null, overrideReason: null,
	hiddenChoiceIds: [], hiddenPointIds: []
};

RehydrateMap.onRehydrate<State>('scenario', state => { return { ...state, savingScenario: false, saveError: false, treeLoading: false, loadError: false }; });

export function reducer(state: State = initialState, action: ScenarioActions): State
{
	let newTree: Tree;
	let choices: Choice[];
	let points: DecisionPoint[];
	let subGroups: SubGroup[];

	switch (action.type)
	{
		case CommonActionTypes.SalesAgreementLoaded:
		case CommonScenarioActionTypes.SetTreeFilter:
		case CommonScenarioActionTypes.SelectChoices:
			let newState = commonScenarioReducer(state, action);
			
			if (action.type === CommonActionTypes.SalesAgreementLoaded){
				newState.hiddenChoiceIds = [];
				newState.hiddenPointIds = [];
	
				if (newState.tree)
				{
					// Choice-To-Choice
					hideChoicesByStructuralItems(newState.rules.choiceRules, choices, points, newState.hiddenChoiceIds);
					
					// Point-To-Choice && Point-To-Point
					hidePointsByStructuralItems(newState.rules.pointRules, choices, points, newState.hiddenChoiceIds, newState.hiddenPointIds);
				}
			}

			return { ...state, ...newState };

		case ScenarioActionTypes.SetStatusForPointsDeclined:
			newTree = _.cloneDeep(state.tree);
			subGroups = _.flatMap(newTree.treeVersion.groups, g => g.subGroups);
			points = _.flatMap(subGroups, sg => sg.points);

			action.divPointCatalogIds?.forEach(id => {
				let point = points.find(x => x.divPointCatalogId === id);
				if (point)
				{
					point.completed = !action.removed;
					point.status = action.removed ? PointStatus.UNVIEWED : PointStatus.COMPLETED;
				}
			});
		
			subGroups.forEach(sg => setSubgroupStatus(sg));
			newTree.treeVersion.groups.forEach(g => setGroupStatus(g));

			return { ...state, tree: newTree };

		default:
			return state;
	}
}

export const selectScenario = createFeatureSelector<State>("scenario");

export { selectCommonScenario, elevationDP } from 'phd-common';