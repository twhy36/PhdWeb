import { Log, ScenarioOption, Scenario, IFeatureSwitchOrgAssoc } from 'phd-common';
import { Action } from '@ngrx/store';
import {
    IOptionCategory, LitePlanOption, ScenarioOptionColorDto, LiteMonotonyRule
} from '../../shared/models/lite.model';

export enum LiteActionTypes {
	SetIsPhdLite = 'Set Is Phd Lite',
	SetIsPhdLiteByFinancialCommunity = 'Set Is Phd Lite By Financial Community',
    LiteOptionsLoaded = 'Lite Options Loaded',
    SelectOptions = 'Select Options',
    SaveScenarioOptions = 'Save Scenario Options',
    ScenarioOptionsSaved = 'Scenario Options Saved',
    SelectOptionColors = 'Select Option Colors',
    SaveScenarioOptionColors = 'Select Scenario Option Colors',
    OptionCategoriesLoaded = 'Option Categories Loaded',
	LoadLiteMonotonyRules = 'Load Lite Monotony Rules',
    LiteMonotonyRulesLoaded = 'LiteMonotonyRulesLoaded',
    SetLiteOverrideReason = 'Set Lite Override Reason',
	CreateJIOForSpecLite = 'Create JIO For Spec Lite',
	LoadLiteSpecOrModel = 'Load Lite Spec Or Model',
    CancelJobChangeOrderLite = 'Cancel Job Change Order Lite',
    LoadLitePlan = 'Load Lite Plan',
    CancelPlanChangeOrderLite = 'Cancel Plan Change Order Lite',
    ToggleQuickMoveInSelections = 'Toggle Quick Move In Selections',
    ResetLiteState = 'Reset Lite State',
    SetIsLiteQMIToggled = 'Set Is Lite QMI Toggled'
}

@Log(true)
export class SetIsPhdLite implements Action {
    readonly type = LiteActionTypes.SetIsPhdLite;

    constructor(public isPhdLite: boolean) { }
}

@Log(true)
export class SetIsPhdLiteByFinancialCommunity implements Action {
    readonly type = LiteActionTypes.SetIsPhdLiteByFinancialCommunity;

    constructor(public isPhdLiteByFinancialCommunity: IFeatureSwitchOrgAssoc[]) { }
}
@Log()
export class LiteOptionsLoaded implements Action {
    readonly type = LiteActionTypes.LiteOptionsLoaded;

    constructor(public options: LitePlanOption[], public scenarioOptions: ScenarioOption[]) { }
}

@Log(true)
export class SelectOptions implements Action {
    readonly type = LiteActionTypes.SelectOptions;

    constructor(public scenarioOptions: ScenarioOption[], public optionColors: ScenarioOptionColorDto[] = []) { }
}

@Log()
export class SaveScenarioOptions implements Action {
    readonly type = LiteActionTypes.SaveScenarioOptions;

    constructor(public scenarioOptions: ScenarioOption[], public optionColors: ScenarioOptionColorDto[] = []) { }
}

@Log()
export class ScenarioOptionsSaved implements Action {
    readonly type = LiteActionTypes.ScenarioOptionsSaved;

    constructor(public scenarioOptions: ScenarioOption[]) { }
}

export class SelectOptionColors implements Action {
    readonly type = LiteActionTypes.SelectOptionColors;

    constructor(public optionColors: ScenarioOptionColorDto[]) { }
}

export class SaveScenarioOptionColors implements Action {
    readonly type = LiteActionTypes.SaveScenarioOptionColors;

    constructor(public optionColors: ScenarioOptionColorDto[]) { }
}

export class OptionCategoriesLoaded implements Action {
    readonly type = LiteActionTypes.OptionCategoriesLoaded;

    constructor(
		public categories: IOptionCategory[]) { }
}

@Log(true)
export class LoadLiteMonotonyRules implements Action {
	readonly type = LiteActionTypes.LoadLiteMonotonyRules;

	constructor(public salesCommunityId: number) { }
}

@Log()
export class LiteMonotonyRulesLoaded implements Action {
	readonly type = LiteActionTypes.LiteMonotonyRulesLoaded;

	constructor(public monotonyRules: LiteMonotonyRule[]) { }
}

@Log(true)
export class SetLiteOverrideReason implements Action
{
	readonly type = LiteActionTypes.SetLiteOverrideReason;
	constructor(public overrideReason: string, public isElevation: boolean) { }
}

@Log()
export class CancelJobChangeOrderLite implements Action
{
	readonly type = LiteActionTypes.CancelJobChangeOrderLite;

	constructor() { }
}

@Log(true)
export class LoadLitePlan implements Action {
	readonly type = LiteActionTypes.LoadLitePlan;

	constructor(public planId: number) { }
}

@Log()
export class CancelPlanChangeOrderLite implements Action
{
	readonly type = LiteActionTypes.CancelPlanChangeOrderLite;

	constructor() { }
}

@Log()
export class CreateJIOForSpecLite implements Action
{
	readonly type = LiteActionTypes.CreateJIOForSpecLite;
	constructor() { }
}

@Log()
export class LoadLiteSpecOrModel implements Action
{
	readonly type = LiteActionTypes.LoadLiteSpecOrModel;
	constructor(public scenario: Scenario) { }
}

@Log()
export class ToggleQuickMoveInSelections implements Action
{
	readonly type = LiteActionTypes.ToggleQuickMoveInSelections;
	constructor(
		public optionsToDelete: ScenarioOption[],
		public optionsToAdd: ScenarioOption[],
		public deletePhdFullData: boolean) { }
}

export class ResetLiteState implements Action {
    readonly type = LiteActionTypes.ResetLiteState;

    constructor() { }
}

export class SetIsLiteQMIToggled implements Action {
    readonly type = LiteActionTypes.SetIsLiteQMIToggled;

    constructor(public isLiteQMIToggled: boolean) { }
}

export type LiteActions =
	SetIsPhdLite |
	SetIsPhdLiteByFinancialCommunity |
    LiteOptionsLoaded |
    SelectOptions |
    SaveScenarioOptions |
    ScenarioOptionsSaved |
    SelectOptionColors |
    SaveScenarioOptionColors |
    OptionCategoriesLoaded |
    LoadLiteMonotonyRules |
    LiteMonotonyRulesLoaded |
    SetLiteOverrideReason |
    CancelJobChangeOrderLite |
    LoadLitePlan |
    CancelPlanChangeOrderLite |
	CreateJIOForSpecLite |
	LoadLiteSpecOrModel |
    ToggleQuickMoveInSelections |
    ResetLiteState |
    SetIsLiteQMIToggled;
