import { Action } from '@ngrx/store';
import { ErrorAction } from '../error.action';
import { MyFavorite, MyFavoritesChoice, MyFavoritesPointDeclined } from '../../shared/models/my-favorite.model';
import { SalesAgreementLoaded, ResetFavorites } from '../actions';

export enum FavoriteActionTypes
{
	MyFavoriteCreated = 'My Favorite Created',
	SetCurrentFavorites = 'Set Current Favorites',
	SaveMyFavoritesChoices = 'Save My Favorites Choices',
	SaveMyFavoritesDeclinedPoints = 'Save My Favorites Declined Points',
	MyFavoritesChoicesSaved = 'My Favorites Choices Saved',
	MyDeclinedFavoritesSaved = 'My Declined Favorites Saved',
	SaveError = 'Save Error',
	DeleteMyFavorite = 'Delete My Favorite',
	MyFavoriteDeleted = 'My Favorite Deleted',
	ToggleContractedOptions = 'Toggle Include Contracted Options',
	AddMyFavoritesPointDeclined = 'Add My Favorites Point Declined',
	DeleteMyFavoritesPointDeclined = 'Delete My Favorites Point Declined',
	MyFavoritesPointDeclinedUpdated = 'My Favorites Point Declined Saved'
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

export class SaveMyFavoritesDeclinedPoints implements Action
{
	readonly type = FavoriteActionTypes.SaveMyFavoritesDeclinedPoints;

	constructor() { console.log("AJ DID A THING!"); }
}

export class MyFavoritesChoicesSaved implements Action
{
	readonly type = FavoriteActionTypes.MyFavoritesChoicesSaved;

	constructor(public choices: MyFavoritesChoice[]) {	}
}

export class MyDeclinedFavoritesSaved implements Action
{
	readonly type = FavoriteActionTypes.MyDeclinedFavoritesSaved;

	constructor(public declinedPoints: MyFavoritesPointDeclined[]) {	}
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

export class AddMyFavoritesPointDeclined implements Action
	{
		readonly type = FavoriteActionTypes.AddMyFavoritesPointDeclined;

		constructor(public myFavoriteId: number, public pointId: number) {	}
	}

export class DeleteMyFavoritesPointDeclined implements Action
	{
		readonly type = FavoriteActionTypes.DeleteMyFavoritesPointDeclined;

		constructor(public myFavoriteId: number, public myFavoritesPointDeclineId: number) {	}
	}

export class MyFavoritesPointDeclinedUpdated implements Action
	{
		readonly type = FavoriteActionTypes.MyFavoritesPointDeclinedUpdated;

		constructor(public myFavoritesPointDeclined: MyFavoritesPointDeclined, 
			public isDelete: boolean) {	}
	}

export type FavoriteActions = 
	MyFavoriteCreated |
	SetCurrentFavorites |
	SaveMyFavoritesChoices |
	MyFavoritesChoicesSaved |
	MyDeclinedFavoritesSaved |
	ResetFavorites |
	SalesAgreementLoaded |
	SaveError |
	DeleteMyFavorite |
	MyFavoriteDeleted |
	ToggleContractedOptions |
	AddMyFavoritesPointDeclined |
	DeleteMyFavoritesPointDeclined |
	MyFavoritesPointDeclinedUpdated;
