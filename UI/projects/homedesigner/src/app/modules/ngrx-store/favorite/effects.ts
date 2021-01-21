import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { from } from 'rxjs/observable/from';

import 
{ 	FavoriteActionTypes, SetCurrentFavorites, MyFavoriteCreated, SaveMyFavoritesChoices, 
	MyFavoritesChoicesSaved, ResetCurrentFavorites, SaveError 
} from './actions';

import { SelectChoices } from '../scenario/actions';
import { tryCatch } from '../error.action';

import { FavoriteService } from '../../core/services/favorite.service';

import * as fromRoot from '../reducers';
import * as fromFavorite from './reducer';

@Injectable()
export class FavoriteEffects
{
	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private favoriteService: FavoriteService
	) { }

	@Effect()
	setCurrentFavorites$: Observable<Action> = this.actions$.pipe(
		ofType<SetCurrentFavorites | MyFavoriteCreated>(FavoriteActionTypes.SetCurrentFavorites, FavoriteActionTypes.MyFavoriteCreated),
		withLatestFrom(this.store.pipe(select(fromFavorite.currentMyFavorite))),
		tryCatch(source => source.pipe(
			switchMap(([action, fav]) => {
				if (fav && fav.myFavoritesChoice && fav.myFavoritesChoice.length)
				{
					let choices = fav.myFavoritesChoice.map(c => {
						return {
							choiceId: c.dpChoiceId,
							quantity: c.dpChoiceQuantity
						};
					});
					return of(new SelectChoices(...choices));
				}
				else
				{
					return new Observable<never>();
				}
  			})
		), SaveError, "Error setting current favorites!")
	);

	@Effect()
	resetCurrentFavorites$: Observable<Action> = this.actions$.pipe(
		ofType<ResetCurrentFavorites>(FavoriteActionTypes.ResetCurrentFavorites),
		withLatestFrom(this.store.pipe(select(fromFavorite.currentMyFavorite))),
		tryCatch(source => source.pipe(
			switchMap(([action, fav]) => {
				if (fav)
				{
					let actions: any[] = [ new SetCurrentFavorites(null) ];

					if (fav.myFavoritesChoice && fav.myFavoritesChoice.length)
					{
						let choices = fav.myFavoritesChoice.map(c => {
							return {
								choiceId: c.dpChoiceId,
								quantity: 0
							};
						});	
						actions.push(new SelectChoices(...choices));				
					}
					
					return from(actions);
				}
				else
				{
					return new Observable<never>();
				}
  			})
		), SaveError, "Error resetting current favorites!")
	);

	@Effect()
	saveMyFavoritesChoices$: Observable<Action> = this.actions$.pipe(
		ofType<SaveMyFavoritesChoices>(FavoriteActionTypes.SaveMyFavoritesChoices),
		withLatestFrom(this.store, this.store.pipe(select(fromFavorite.currentMyFavorite))),
		tryCatch(source => source.pipe(
			switchMap(([action, store, fav]) => {
				const choices = this.favoriteService.getFavoriteChoices(store.scenario.tree, store.favorite.selectedChoices, fav);
                return this.favoriteService.saveMyFavoritesChoices(fav.id, choices);
  			}),
			switchMap(results => of(new MyFavoritesChoicesSaved(results)))
		), SaveError, "Error saving my favorite choices!")
	);
}
