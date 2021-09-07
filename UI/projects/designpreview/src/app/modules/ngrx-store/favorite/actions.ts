import { Action } from '@ngrx/store';
import { ErrorAction } from '../error.action';
import { MyFavorite, MyFavoritesChoice, MyFavoritesPointDeclined, DesignToolAttribute } from 'phd-common';
import { SalesAgreementLoaded, ResetFavorites, MyFavoritesChoiceAttributesDeleted } from '../actions';

export enum FavoriteActionTypes
{
	MyFavoriteCreated = 'My Favorite Created',
	SetCurrentFavorites = 'Set Current Favorites',
	SaveMyFavoritesChoices = 'Save My Favorites Choices',
	MyFavoritesChoicesSaved = 'My Favorites Choices Saved',
	SaveError = 'Save Error',
	DeleteMyFavorite = 'Delete My Favorite',
	MyFavoriteDeleted = 'My Favorite Deleted',
	ToggleContractedOptions = 'Toggle Display Contracted Options',
	AddMyFavoritesPointDeclined = 'Add My Favorites Point Declined',
	DeleteMyFavoritesPointDeclined = 'Delete My Favorites Point Declined',
	MyFavoritesPointDeclinedUpdated = 'My Favorites Point Declined Saved',
	LoadMyFavorite = 'Load My Favorite',
	LoadDefaultFavorite = 'Load Default Favorite',
	MyFavoriteLoaded = 'My Favorite Loaded',
	MyFavoritesChoicesDeleted = 'My Favorites Choices Deleted',
	DeleteMyFavoritesChoiceAttributes = 'Delete MyFavorites Choice Attributes'
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

export class AddMyFavoritesPointDeclined implements Action
	{
		readonly type = FavoriteActionTypes.AddMyFavoritesPointDeclined;

		constructor(public myFavoriteId: number, public pointId: number, public divPointCatalogId: number) {	}
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

export class LoadMyFavorite implements Action
{
	readonly type = FavoriteActionTypes.LoadMyFavorite;

	constructor() {	}
}

export class LoadDefaultFavorite implements Action
{
	readonly type = FavoriteActionTypes.LoadDefaultFavorite;

	constructor() {	}
}

export class MyFavoriteLoaded implements Action
{
	readonly type = FavoriteActionTypes.MyFavoriteLoaded;

	constructor() {	}
}

export class MyFavoritesChoicesDeleted implements Action
{
	readonly type = FavoriteActionTypes.MyFavoritesChoicesDeleted;

	constructor(public choices: MyFavoritesChoice[]) {	}
}

export class DeleteMyFavoritesChoiceAttributes implements Action
{
	readonly type = FavoriteActionTypes.DeleteMyFavoritesChoiceAttributes;

	constructor(public attributes: DesignToolAttribute[], public locations: DesignToolAttribute[], public myFavoritesChoice: MyFavoritesChoice) {	}
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
	ToggleContractedOptions |
	AddMyFavoritesPointDeclined |
	DeleteMyFavoritesPointDeclined |
	MyFavoritesPointDeclinedUpdated |
	LoadMyFavorite |
	LoadDefaultFavorite |
	MyFavoriteLoaded |
	MyFavoritesChoicesDeleted |
	DeleteMyFavoritesChoiceAttributes |
	MyFavoritesChoiceAttributesDeleted;
