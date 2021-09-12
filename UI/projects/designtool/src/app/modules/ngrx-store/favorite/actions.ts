import { Action } from '@ngrx/store';
import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded } from '../actions';

export enum FavoriteActionTypes
{
	DeleteMyFavorites = 'Delete My Favorite',
	MyFavoritesDeleted = 'My Favorite Deleted',
	SaveError = 'Save Error'
}

export class DeleteMyFavorites implements Action
{
	readonly type = FavoriteActionTypes.DeleteMyFavorites;

	constructor() {  }
}

export class MyFavoritesDeleted implements Action
{
	readonly type = FavoriteActionTypes.MyFavoritesDeleted;

	constructor() {  }
}

export class SaveError extends ErrorAction
{
	readonly type = FavoriteActionTypes.SaveError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export type FavoriteActions =
	DeleteMyFavorites |
	MyFavoritesDeleted |
	SaveError |
	SalesAgreementLoaded;
