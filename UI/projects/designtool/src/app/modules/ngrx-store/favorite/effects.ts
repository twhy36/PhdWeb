import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { switchMap, withLatestFrom } from 'rxjs/operators';

import
{ 	
	FavoriteActionTypes, SaveError, DeleteMyFavorites, MyFavoritesDeleted
} from './actions';

import { tryCatch } from '../error.action';

import { FavoriteService } from '../../core/services/favorite.service';

import * as fromRoot from '../reducers';

@Injectable()
export class FavoriteEffects
{
	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private favoriteService: FavoriteService
	) { }

	deleteMyFavorites$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<DeleteMyFavorites>(FavoriteActionTypes.DeleteMyFavorites),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) => {
					if (store.favorite?.myFavorites?.length)
					{
						return this.favoriteService.deleteMyFavorites(store.favorite.myFavorites);
					}
					else
					{
						return new Observable<never>();
					}
				}),
				switchMap(result => of(new MyFavoritesDeleted()))
			), SaveError, "Error deleting my favorites!")
		)
	);

}
