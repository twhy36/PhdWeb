import { Log } from 'phd-common';
import { Action } from '@ngrx/store';
import { LitePlanOption, ScenarioOption, ScenarioOptionColor, ScenarioOptionColorDto } from '../../shared/models/lite.model';

export enum LiteActionTypes {
    SetIsPhdLite = 'Set Is Phd Lite',
    LiteOptionsLoaded = 'Lite Options Loaded',
    SelectOptions = 'Select Options',
    SaveScenarioOptions = 'Select Scenario Options',
    ScenarioOptionsSaved = 'Scenario Options Saved',
    SelectOptionColors = 'Select Option Colors',
    SaveScenarioOptionColors = 'Select Scenario Option Colors',
    SetScenarioLoaded = 'Set Scenario Loaded'
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

export type LiteActions =
    SetIsPhdLite |
    LiteOptionsLoaded |
    SelectOptions |
    SaveScenarioOptions |
    ScenarioOptionsSaved |
    SelectOptionColors |
    SaveScenarioOptionColors |
    SetScenarioLoaded;
