import { Action } from '@ngrx/store';

export enum NavActionTypes {
	SetSelectedSubgroup = 'Set Selected Subgroup'
}

export class SetSelectedSubgroup implements Action {
	readonly type = NavActionTypes.SetSelectedSubgroup;

    constructor(public selectedSubGroup: number) { }
}

export type NavActions = SetSelectedSubgroup;
