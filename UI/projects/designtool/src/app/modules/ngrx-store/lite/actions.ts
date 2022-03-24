import { Log, ScenarioOption } from 'phd-common';
import { Action } from '@ngrx/store';
import { 
    IOptionCategory, LitePlanOption, ScenarioOptionColorDto, LiteMonotonyRule 
} from '../../shared/models/lite.model';

export enum LiteActionTypes {
    SetIsPhdLite = 'Set Is Phd Lite',
    LiteOptionsLoaded = 'Lite Options Loaded',
    SelectOptions = 'Select Options',
    SaveScenarioOptions = 'Save Scenario Options',
    ScenarioOptionsSaved = 'Scenario Options Saved',
    SelectOptionColors = 'Select Option Colors',
    SaveScenarioOptionColors = 'Select Scenario Option Colors',
    SetScenarioLoaded = 'Set Scenario Loaded',
    OptionCategoriesLoaded = 'Option Categories Loaded',
	LoadLiteMonotonyRules = 'Load Lite Monotony Rules',
    LiteMonotonyRulesLoaded = 'LiteMonotonyRulesLoaded',
    SetLiteOverrideReason = 'Set Lite Override Reason',
    CancelJobChangeOrderLite = 'Cancel Job Change Order Lite',   
}

@Log(true)
export class SetIsPhdLite implements Action {
    readonly type = LiteActionTypes.SetIsPhdLite;

    constructor(public isPhdLite: boolean) { }
}

@Log()
export class LiteOptionsLoaded implements Action {
    readonly type = LiteActionTypes.LiteOptionsLoaded;

    constructor(public options: LitePlanOption[], public scenarioOptions: ScenarioOption[]) { }
}

@Log(true)
export class SelectOptions implements Action {
    readonly type = LiteActionTypes.SelectOptions;

    constructor(public scenarioOptions: ScenarioOption[]) { }
}

@Log()
export class SaveScenarioOptions implements Action {
    readonly type = LiteActionTypes.SaveScenarioOptions;

    constructor(public scenarioOptions: ScenarioOption[]) { }
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

@Log(true)
export class SetScenarioLoaded implements Action {
    readonly type = LiteActionTypes.SetScenarioLoaded;

    constructor(public isLoaded: boolean) { }
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

export type LiteActions =
    SetIsPhdLite |
    LiteOptionsLoaded |
    SelectOptions |
    SaveScenarioOptions |
    ScenarioOptionsSaved |
    SelectOptionColors |
    SaveScenarioOptionColors |
	SetScenarioLoaded |
    OptionCategoriesLoaded |
    LoadLiteMonotonyRules | 
    LiteMonotonyRulesLoaded |
    SetLiteOverrideReason |
    CancelJobChangeOrderLite;

