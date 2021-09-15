import { Action } from '@ngrx/store';

export enum LiteActionTypes {
    SetIsPhdLite = 'Set Is Phd Lite'
}

export class SetIsPhdLite implements Action {
    readonly type = LiteActionTypes.SetIsPhdLite;

    constructor(public isPhdLite: boolean) { }
}

export type LiteActions =
    SetIsPhdLite ;
