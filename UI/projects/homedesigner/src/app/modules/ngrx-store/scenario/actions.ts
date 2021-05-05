import { Action } from '@ngrx/store';

import { TreeFilter, DesignToolAttribute } from 'phd-common';
import { SalesAgreementLoaded } from '../actions';

export enum ScenarioActionTypes
{
	SelectChoices = 'Select Choices',
	SelectDeclinedPoints = "Select Declined Points",
	SetTreeFilter = 'Set Tree filter'
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

export class SelectDeclinedPoints implements Action
{
	readonly type = ScenarioActionTypes.SelectDeclinedPoints;
	public declinedPoints: { dPointId: number, decisionPointLabel?: string }[];

	constructor(...declinedPoints: { dPointId: number, decisionPointLabel?: string }[])
	{
		this.declinedPoints = declinedPoints;
		console.log("Hello from actions");
		console.log(this.declinedPoints);
	}
}

export class SetTreeFilter implements Action
{
	readonly type = ScenarioActionTypes.SetTreeFilter;

	constructor(public treeFilter: TreeFilter) { }
}

export type ScenarioActions =
	SelectChoices |
	SetTreeFilter |
	SelectDeclinedPoints |
	SalesAgreementLoaded;
