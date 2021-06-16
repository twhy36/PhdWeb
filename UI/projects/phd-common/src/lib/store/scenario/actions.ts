import { Action } from '@ngrx/store';

import { TreeFilter, DesignToolAttribute } from 'phd-common';
import { SalesAgreementLoaded } from '../actions';

export enum CommonScenarioActionTypes
{
	SelectChoices = 'Select Choices',
	SetTreeFilter = 'Set Tree filter'
}

export class SelectChoices implements Action
{
	readonly type = CommonScenarioActionTypes.SelectChoices;
	public choices: { choiceId: number, quantity: number, attributes?: DesignToolAttribute[] }[];
	
	constructor(...choices: { choiceId: number, quantity: number, attributes?: DesignToolAttribute[] }[])
	{
		this.choices = choices;
	}
}

export class SetTreeFilter implements Action
{
	readonly type = CommonScenarioActionTypes.SetTreeFilter;

	constructor(public treeFilter: TreeFilter) { }
}

export type CommonScenarioActions =
	SelectChoices |
	SetTreeFilter |
	SalesAgreementLoaded;
