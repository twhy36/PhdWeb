import { Action } from '@ngrx/store';
import { Observable, of, OperatorFunction } from 'rxjs';
import { switchMap, concatMap, mergeMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DesignPreviewError } from '../shared/models/error.model';
import { CommonActionTypes } from './actions';

export enum ErrorFrom {
	HomeComponent = 'Home.Component',
	LoadPresale = 'Scenario.LoadPresale',
	LoadPresaleInactive = 'Scenario.LoadPresale.Inactive',
	LoadPresaleNoPubleshed = 'Scenario.LoadPresale.NoPublished',
	PageNotFound = 'WildcardPath.error',
	LoadSelectedPlan = 'Lots.LoadSelectedPlan',
	LoadSalesAgreement = 'LoadSalesAgreement',
	LoadPreview = 'Scenario.LoadPreview',
	SetCurrentFavorites = 'Favorite.SetCurrentFavorites',
	ResetFavorites = 'Favorite.ResetFavorites',
	SaveMyFavoritesChoices = 'Favorite.SaveMyFavoritesChoices',
	PushAdobeFavoriteEvent = 'Favorite.PushAdobeFavoriteEvent',
	AddMyFavoritesPointDeclined = 'Favorite.AddMyFavoritesPointDeclined',
	DeleteMyFavoritesPointDeclined = 'Favorite.DeleteMyFavoritesPointDeclined',
	DeleteMyFavorites = 'Favorite.DeleteMyFavorites',
	LoadMyFavorite = 'Favorite.LoadMyFavorite',
	LoadDefaultFavorite = 'Favorite.LoadDefaultFavorite',
	UpdateMyFavoritesChoicesOnInit = 'Favorite.UpdateMyFavoritesChoicesOnInit',
	DeleteMyFavoritesChoiceAttributes = 'Favorite.DeleteMyFavoritesChoiceAttributes'
};

export class ErrorAction implements Action 
{
	type: string;

	constructor(public error: Error, public friendlyMessage?: string, public errFrom?: string) { }
}

export class SetLatestError implements Action 
{
	readonly type = CommonActionTypes.SetLatestError;

	constructor(public error: DesignPreviewError) { };
}

export class ClearLatestError implements Action 
{
	readonly type = CommonActionTypes.ClearLatestError;
	constructor() { };
}

export class PageNotFound extends ErrorAction 
{
	readonly type = CommonActionTypes.PageNotFound;

	constructor(public error: Error, public friendlyMessage?: string, public errFrom = ErrorFrom.PageNotFound) { super(error, friendlyMessage, errFrom); }
}

export enum MapFunction {
	switchMap,
	concatMap,
	mergeMap
}

export function tryCatch<T, R, E extends ErrorAction>(project: OperatorFunction<T, R>,
	errorType: { new(error: Error, friendlyMessage: string, sName?: string): E },
	friendlyMessage?: (string | ((error: Error) => string)),
	errFrom?: string,
	mapFn: MapFunction = MapFunction.switchMap
): OperatorFunction<T, R | E> 
{
	return (source: Observable<T>) => source.pipe(
		[switchMap, concatMap, mergeMap][mapFn](data =>
			of(data).pipe(
				project,
				catchError((err: Error) => 
				{
					if (!environment.production && err) 
					{
						console.error(err);
					}

					return of(new errorType(err,
						(friendlyMessage ? (typeof friendlyMessage === 'string' ? friendlyMessage : friendlyMessage(err)) : null),
						errFrom ? errFrom : '')
					)
				})
			)
		)
	);
} 