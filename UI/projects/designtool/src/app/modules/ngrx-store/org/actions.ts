import { Action } from '@ngrx/store';
import { SalesCommunity } from 'phd-common';
import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded, JobLoaded, ScenarioLoaded } from '../actions';

export enum OrgActionTypes {
	LoadSalesCommunity = 'Load Sales Community',
	SalesCommunityLoaded = 'Sales Community Loaded',
	LoadError = 'Sales Community Load Error',
}

export class LoadSalesCommunity implements Action {
	readonly type = OrgActionTypes.LoadSalesCommunity;

    constructor(public salesCommunityId: number) { }
}

export class SalesCommunityLoaded implements Action {
	readonly type = OrgActionTypes.SalesCommunityLoaded;

    constructor(public community: SalesCommunity) { }
}

export class LoadError extends ErrorAction {
	readonly type = OrgActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export type OrgActions =
	LoadSalesCommunity |
	SalesCommunityLoaded |
	LoadError |
	SalesAgreementLoaded |
	JobLoaded |
	ScenarioLoaded;
