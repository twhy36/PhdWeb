import { Action } from '@ngrx/store';

import { TreeFilter } from 'phd-common';
import { SalesAgreementLoaded } from '../actions';

export enum ScenarioActionTypes
{
	SetTreeFilter = 'Set Tree filter'
}

export class SetTreeFilter implements Action
{
	readonly type = ScenarioActionTypes.SetTreeFilter;

	constructor(public treeFilter: TreeFilter) { }
}

export type ScenarioActions =
	SetTreeFilter |
	SalesAgreementLoaded;
