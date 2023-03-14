import { Action } from '@ngrx/store';
import { Lot, LotExt, MonotonyRule, Log } from 'phd-common';
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

@Log(true, [LotActionTypes.LotsLoaded, LotActionTypes.LoadError])
export class LoadLots implements Action
{
	readonly type = LotActionTypes.LoadLots;

	constructor(public salesCommunityId: number, public isModel?: boolean, public useCache?: boolean) { }
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

@Log(true)
export class SelectLot implements Action
{
	readonly type = LotActionTypes.SelectLot;

	constructor(public id: number) { }
}

@Log(true)
export class SelectedLotLoaded implements Action {
	readonly type = LotActionTypes.SelectedLotLoaded;

	constructor(public selectedLot: LotExt) { }
}

@Log(true)
export class SelectHanding implements Action
{
	readonly type = LotActionTypes.SelectHanding;

	constructor(public lotId: number, public handing: string) { }
}

@Log()
export class DeselectLot implements Action
{
	readonly type = LotActionTypes.DeselectLot;

	constructor() { }
}

@Log(true)
export class LoadMonotonyRules implements Action {
	readonly type = LotActionTypes.LoadMonotonyRules;

	constructor(public salesCommunityId: number) { }
}

@Log()
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
