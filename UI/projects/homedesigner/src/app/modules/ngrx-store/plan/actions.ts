import { Action } from '@ngrx/store';

import { Plan } from 'phd-common';

import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded } from '../actions';

export enum PlanActionTypes
{
	LoadSelectedPlan = 'Load Selected Plan',
	SelectedPlanLoaded = 'Selected Plans Loaded',
	LoadError = 'Plan Load Error'
}

export class LoadSelectedPlan implements Action {
	readonly type = PlanActionTypes.LoadSelectedPlan;

	constructor(public planId: number, public planPrice?: number) { }
}

export class SelectedPlanLoaded implements Action {
	readonly type = PlanActionTypes.SelectedPlanLoaded;

	constructor(public plans: Array<Plan>) { }
}

export class LoadError extends ErrorAction {
	readonly type = PlanActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export type PlanActions =
	LoadSelectedPlan |
	SelectedPlanLoaded |
	LoadError |
	SalesAgreementLoaded;
