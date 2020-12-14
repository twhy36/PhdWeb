import { Action } from '@ngrx/store';

import { TreeFilter } from '../../shared/models/scenario.model';
import { SalesAgreementLoaded } from '../actions';

export enum ScenarioActionTypes
{
	SetSelectedSubgroup = 'Set Selected Subgroup',
	SetTreeFilter = 'Set Tree filter'
}

export class SetSelectedSubgroup implements Action {
	readonly type = ScenarioActionTypes.SetSelectedSubgroup;

	constructor(public selectedSubGroup: number) { }
}

export class SetTreeFilter implements Action
{
	readonly type = ScenarioActionTypes.SetTreeFilter;

	constructor(public treeFilter: TreeFilter) { }
}

export type ScenarioActions =
	SetSelectedSubgroup |
	SetTreeFilter |
	SalesAgreementLoaded;
