import { Action } from '@ngrx/store';
import { ErrorAction } from '../error.action';
import { MyFavorite, MyFavoritesChoice } from '../../shared/models/my-favorite.model';
import { SalesAgreementLoaded } from '../actions';

export enum FavoriteActionTypes
{
	MyFavoriteCreated = 'My Favorite Created',
	SetCurrentFavorites = 'Set Current Favorites',
	SaveMyFavoritesChoices = 'Save My Favorites Choices',
	MyFavoritesChoicesSaved = 'My Favorites Choices Saved',
	ResetCurrentFavorites = 'Reset Current Favorites',
	SaveError = 'Save Error'
}

export class MyFavoriteCreated implements Action
{
	readonly type = FavoriteActionTypes.MyFavoriteCreated;

	constructor(public myFavorite: MyFavorite) {	}
}

export class SetCurrentFavorites implements Action
{
	readonly type = FavoriteActionTypes.SetCurrentFavorites;

	constructor(public favoritesId: number) {	}
}

export class SaveMyFavoritesChoices implements Action
{
	readonly type = FavoriteActionTypes.SaveMyFavoritesChoices;

	constructor() { }
}

export class MyFavoritesChoicesSaved implements Action
{
	readonly type = FavoriteActionTypes.MyFavoritesChoicesSaved;

	constructor(public choices: MyFavoritesChoice[]) {	}
}

export class ResetCurrentFavorites implements Action
{
	readonly type = FavoriteActionTypes.ResetCurrentFavorites;

	constructor() {	}
}

export class SaveError extends ErrorAction
{
	readonly type = FavoriteActionTypes.SaveError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export type FavoriteActions = 
	MyFavoriteCreated |
	SetCurrentFavorites |
	SaveMyFavoritesChoices |
	MyFavoritesChoicesSaved |
	ResetCurrentFavorites |
	SalesAgreementLoaded |
	SaveError;
