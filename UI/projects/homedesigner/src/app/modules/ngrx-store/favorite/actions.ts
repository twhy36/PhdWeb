import { Action } from '@ngrx/store';

export enum FavoriteActionTypes
{
	SetCurrentFavorites = 'Set Current Favorites'
}

export class SetCurrentFavorites implements Action
{
	readonly type = FavoriteActionTypes.SetCurrentFavorites;

	constructor(public name: string) {	}
}

export type FavoriteActions = SetCurrentFavorites;
