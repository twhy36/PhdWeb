import { Action } from '@ngrx/store';

import { TreeFilter, DesignToolAttribute } from 'phd-common';
import { LoadSalesAgreement, SalesAgreementLoaded } from '../actions';

export enum ScenarioActionTypes
{
	SelectChoices = 'Select Choices',
	SetTreeFilter = 'Set Tree filter',
	SetStatusForPointsDeclined = 'Set Status For Points Declined'
}

export class SelectChoices implements Action
{
	readonly type = ScenarioActionTypes.SelectChoices;
	public choices: { choiceId: number, quantity: number, attributes?: DesignToolAttribute[] }[];
	
	constructor(...choices: { choiceId: number, quantity: number, attributes?: DesignToolAttribute[] }[])
	{
		this.choices = choices;
	}
}

export class SetTreeFilter implements Action
{
	readonly type = ScenarioActionTypes.SetTreeFilter;

	constructor(public treeFilter: TreeFilter) { }
}

export class SetStatusForPointsDeclined implements Action
{
	readonly type = ScenarioActionTypes.SetStatusForPointsDeclined;

	constructor(public divPointCatalogIds: number[], public removed: boolean) { }
}

export type ScenarioActions =
	LoadSalesAgreement |
	SelectChoices |
	SetTreeFilter |
	SalesAgreementLoaded | 
	SetStatusForPointsDeclined;
