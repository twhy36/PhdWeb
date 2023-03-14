import { Action } from '@ngrx/store';
import { ResetFavorites } from '../actions';

export enum NavActionTypes {
	SetSelectedSubgroup = 'Set Selected Subgroup',
	SetIncludedSubgroup = 'Set Included Subgroup'
}

export class SetSelectedSubgroup implements Action 
{
	readonly type = NavActionTypes.SetSelectedSubgroup;

	constructor(public selectedSubGroup: number, public selectedPoint?: number, public selectedChoice?: number) { }
}

export class SetIncludedSubgroup implements Action 
{
	readonly type = NavActionTypes.SetIncludedSubgroup;

	constructor(public includedSubGroup?: number, public includedPoint?: number) { }
}

export type NavActions = 
	ResetFavorites | 
	SetSelectedSubgroup |
	SetIncludedSubgroup;
