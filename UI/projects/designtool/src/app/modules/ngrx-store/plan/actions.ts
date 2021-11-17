import { Action } from '@ngrx/store';
import { Plan } from 'phd-common';
import { ErrorAction } from '../error.action';
import { ScenarioLoaded, SalesAgreementLoaded, JobLoaded } from '../actions';

export enum PlanActionTypes {
    LoadPlans = 'Load Plans',
    PlansLoaded = 'Plans Loaded',
    LoadError = 'Plan Load Error',
    SelectPlan = 'Select Plan',
	DeselectPlan = 'Deselect Plan',
	SetWebPlanMapping = 'Set Web Plan Mapping',
	LoadSelectedPlan = 'Load Selected Plan',
	SelectedPlanLoaded = 'Selected Plan Loaded'
}

export class LoadPlans implements Action {
    readonly type = PlanActionTypes.LoadPlans;

	constructor(public salesCommunityId: number, public selectedPlanPrice?: { planId: number, listPrice: number }) { }
}

export class PlansLoaded implements Action {
    readonly type = PlanActionTypes.PlansLoaded;

    constructor(public plans: Array<Plan>) { }
}

export class LoadError extends ErrorAction {
    readonly type = PlanActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export class SelectPlan implements Action {
    readonly type = PlanActionTypes.SelectPlan;

    constructor(public planId: number, public treeVersionId: number, public marketingPlanId?: number[]) { }
}

export class DeselectPlan implements Action {
    readonly type = PlanActionTypes.DeselectPlan;

    constructor() { }
}

export class SetWebPlanMapping implements Action {
	readonly type = PlanActionTypes.SetWebPlanMapping;

	constructor(public marketingPlanId: number[]) { }
}

export class LoadSelectedPlan implements Action {
	readonly type = PlanActionTypes.LoadSelectedPlan;

	constructor(public planId: number, public treeVersionId: number) { }
}

export class SelectedPlanLoaded implements Action {
	readonly type = PlanActionTypes.SelectedPlanLoaded;

	constructor() { }
}

export type PlanActions =
    LoadPlans |
    PlansLoaded |
    LoadError |
    SelectPlan |
	DeselectPlan |
	SetWebPlanMapping |
	LoadSelectedPlan |
	SelectedPlanLoaded |
	ScenarioLoaded |
	SalesAgreementLoaded |
	JobLoaded;
