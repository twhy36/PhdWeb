import { HttpErrorResponse } from '@angular/common/http';
import { Action } from '@ngrx/store';
import { Observable, of, OperatorFunction } from 'rxjs';
import { switchMap, concatMap, mergeMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DesignPreviewError } from '../shared/models/error.model';
import { CommonActionTypes } from './actions';

export enum ErrorFrom
{
	HomeComponent = 'Home.Component',
	LoadPresale = 'Scenario.LoadPresale',
	LoadPresaleInactive = 'Scenario.LoadPresale.Inactive',
	LoadPresaleNoPubleshed = 'Scenario.LoadPresale.NoPublished',
	PageNotFound = 'WildcardPath.error',
	GuardError = 'Guard',
	TimeoutError = 'Timeout.error',
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

export class GuardError extends ErrorAction 
{
	readonly type = CommonActionTypes.GuardError;

	constructor(public error: Error, public friendlyMessage?: string, public errFrom = ErrorFrom.GuardError) { super(error, friendlyMessage, errFrom); }
}

export class TimeoutError extends ErrorAction
{
	readonly type = CommonActionTypes.TimeoutError;

	constructor(public error: Error, public friendlyMessage?: string, public errFrom = ErrorFrom.TimeoutError) { super(error, friendlyMessage, errFrom); }
}

export enum MapFunction
{
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
					const fm = (friendlyMessage ? (typeof friendlyMessage === 'string' ? friendlyMessage : friendlyMessage(err)) : null);

					if (!environment.production && err) 
					{
						console.error(err);
					}

					if ((err as HttpErrorResponse).status === 408)
					{
						return of(new TimeoutError(err, fm) as E);
					}

					return of(new errorType(err, fm, errFrom ? errFrom : ''));
				})
			)
		)
	);
} 