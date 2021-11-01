import { Action } from '@ngrx/store';
import { LitePlanOption, ScenarioOption } from '../../shared/models/lite.model';

export enum LiteActionTypes {
    SetIsPhdLite = 'Set Is Phd Lite',
    LiteOptionsLoaded = 'Lite Options Loaded',
    SelectOptions = 'Select Options',
    SaveScenarioOptions = 'Select Scenario Options',
    ScenarioOptionsSaved = 'Scenario Options Saved'
}

export class SetIsPhdLite implements Action {
    readonly type = LiteActionTypes.SetIsPhdLite;

    constructor(public isPhdLite: boolean) { }
}

export class LiteOptionsLoaded implements Action {
    readonly type = LiteActionTypes.LiteOptionsLoaded;

    constructor(public options: LitePlanOption[], public scenarioOptions: ScenarioOption[]) { }
}

export class SelectOptions implements Action {
    readonly type = LiteActionTypes.SelectOptions;

    constructor(public scenarioOptions: ScenarioOption[]) { }
}

export class SaveScenarioOptions implements Action {
    readonly type = LiteActionTypes.SaveScenarioOptions;

    constructor(public scenarioOptions: ScenarioOption[]) { }
}

export class ScenarioOptionsSaved implements Action {
    readonly type = LiteActionTypes.ScenarioOptionsSaved;

    constructor(public scenarioOptions: ScenarioOption[]) { }
}

export type LiteActions =
    SetIsPhdLite |
    LiteOptionsLoaded |
    SelectOptions |
    SaveScenarioOptions |
    ScenarioOptionsSaved;
