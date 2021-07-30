import { Action } from '@ngrx/store';

import { Plan } from 'phd-common';

import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded } from '../actions';

export enum PlanActionTypes
{
	SelectPlan = 'Select Plan',
	PlansLoaded = 'Plans Loaded',
	LoadSelectedPlan = 'Load Selected Plan',
	SelectedPlanLoaded = 'Selected Plans Loaded',
	LoadError = 'Plan Load Error',
	SetWebPlanMapping = 'Set Web Plan Mapping',
}

export class SelectPlan implements Action {
    readonly type = PlanActionTypes.SelectPlan;

    constructor(public planId: number, public treeVersionId: number, public marketingPlanId?: number[]) { }
}

export class PlansLoaded implements Action {
    readonly type = PlanActionTypes.PlansLoaded;

    constructor(public plans: Array<Plan>) { }
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

export class SetWebPlanMapping implements Action {
	readonly type = PlanActionTypes.SetWebPlanMapping;

	constructor(public marketingPlanId: number[]) { }
}

export type PlanActions =
	SelectPlan |
	PlansLoaded |
	LoadSelectedPlan |
	SelectedPlanLoaded |
	LoadError |
	SetWebPlanMapping |
	SalesAgreementLoaded;
