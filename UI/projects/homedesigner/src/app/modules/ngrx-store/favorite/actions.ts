import { Action } from '@ngrx/store';
import { ErrorAction } from '../error.action';
import { MyFavorite, MyFavoritesChoice } from '../../shared/models/my-favorite.model';
import { SalesAgreementLoaded, ResetFavorites } from '../actions';

export enum FavoriteActionTypes
{
	MyFavoriteCreated = 'My Favorite Created',
	SetCurrentFavorites = 'Set Current Favorites',
	SaveMyFavoritesChoices = 'Save My Favorites Choices',
	MyFavoritesChoicesSaved = 'My Favorites Choices Saved',
	SaveError = 'Save Error',
	DeleteMyFavorite = 'Delete My Favorite',
	MyFavoriteDeleted = 'My Favorite Deleted',
	ToggleContractedOptions = 'Toggle Include Contracted Options'
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

export class SaveError extends ErrorAction
{
	readonly type = FavoriteActionTypes.SaveError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export class DeleteMyFavorite implements Action
{
	readonly type = FavoriteActionTypes.DeleteMyFavorite;

	constructor(public myFavorite: MyFavorite) {  }
}

export class MyFavoriteDeleted implements Action
{
	readonly type = FavoriteActionTypes.MyFavoriteDeleted;

	constructor(public myFavoriteId: number) {  }
}

export class ToggleContractedOptions implements Action
{
	readonly type = FavoriteActionTypes.ToggleContractedOptions;

	constructor() {	}
}

export type FavoriteActions = 
	MyFavoriteCreated |
	SetCurrentFavorites |
	SaveMyFavoritesChoices |
	MyFavoritesChoicesSaved |
	ResetFavorites |
	SalesAgreementLoaded |
	SaveError |
	DeleteMyFavorite |
	MyFavoriteDeleted |
	ToggleContractedOptions;
