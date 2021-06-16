import { Action } from '@ngrx/store';
import { Lot } from 'phd-common';
import { ErrorAction } from 'phd-store';
import { SalesAgreementLoaded } from '../actions';

export enum LotActionTypes
{
	LoadLots = 'Load Lots',
	LotsLoaded = 'Lots Loaded',
	LoadError = 'Lot Load Error'
}

export class LoadLots implements Action {
	readonly type = LotActionTypes.LoadLots;

	constructor(public salesCommunityId: number) { }
}

export class LotsLoaded implements Action {
	readonly type = LotActionTypes.LotsLoaded;

	constructor(public lots: Array<Lot>) { }
}

export class LoadError extends ErrorAction {
	readonly type = LotActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export type LotActions =
	LoadLots |
	LotsLoaded |
	LoadError |
	SalesAgreementLoaded;
