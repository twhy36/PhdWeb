import { Action } from '@ngrx/store';

import { CommonScenarioActions } from 'phd-store';

export enum ScenarioActionTypes {
	SetStatusForPointsDeclined = 'Set Status For Points Declined'
}

export class SetStatusForPointsDeclined implements Action
{
	readonly type = ScenarioActionTypes.SetStatusForPointsDeclined;

	constructor(public divPointCatalogIds: number[], public removed: boolean) { }
}

export type ScenarioActions =
	CommonScenarioActions |
	SetStatusForPointsDeclined;
