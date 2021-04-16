import { Action } from '@ngrx/store';
import { Lot, LotExt, MonotonyRule } from 'phd-common';
import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded, JobLoaded, ScenarioLoaded } from '../actions';

export enum LotActionTypes
{
	LoadLots = 'Load Lots',
	LotsLoaded = 'Lots Loaded',
	LoadError = 'Lot Load Error',
	SelectLot = 'Select Lot',
	SelectHanding = 'Select Handing',
	DeselectLot = 'Deselect Lot',
	SelectedLotLoaded = 'Selected Lot Loaded',
	LoadMonotonyRules = 'Load Monotony Rules',
	MonotonyRulesLoaded = 'MonotonyRulesLoaded'
}

export class LoadLots implements Action
{
	readonly type = LotActionTypes.LoadLots;

	constructor(public salesCommunityId: number, public isModel?: boolean) { }
}

export class LotsLoaded implements Action
{
	readonly type = LotActionTypes.LotsLoaded;

	constructor(public lots: Array<Lot>) { }
}

export class LoadError extends ErrorAction
{
	readonly type = LotActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export class SelectLot implements Action
{
	readonly type = LotActionTypes.SelectLot;

	constructor(public id: number) { }
}

export class SelectedLotLoaded implements Action {
	readonly type = LotActionTypes.SelectedLotLoaded;

	constructor(public selectedLot: LotExt) { }
}

export class SelectHanding implements Action
{
	readonly type = LotActionTypes.SelectHanding;

	constructor(public lotId: number, public handing: string) { }
}

export class DeselectLot implements Action
{
	readonly type = LotActionTypes.DeselectLot;

	constructor() { }
}

export class LoadMonotonyRules implements Action {
	readonly type = LotActionTypes.LoadMonotonyRules;

	constructor(public salesCommunityId: number) { }
}

export class MonotonyRulesLoaded implements Action {
	readonly type = LotActionTypes.MonotonyRulesLoaded;

	constructor(public monotonyRules: MonotonyRule[]) { }
}

export type LotActions =
	LoadLots |
	LotsLoaded |
	LoadError |
	SelectLot |
	SelectedLotLoaded |
	SelectHanding |
	DeselectLot |
	SalesAgreementLoaded |
	JobLoaded |
	ScenarioLoaded |
	LoadMonotonyRules |
	MonotonyRulesLoaded;
