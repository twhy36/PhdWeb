import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { from } from 'rxjs/observable/from';

import * as _ from 'lodash';

import { DesignToolAttribute } from 'phd-common';

import 
{ 	FavoriteActionTypes, SetCurrentFavorites, MyFavoriteCreated, SaveMyFavoritesChoices, 
	MyFavoritesChoicesSaved, SaveError, DeleteMyFavorite, MyFavoriteDeleted,
	AddMyFavoritesPointDeclined, DeleteMyFavoritesPointDeclined, MyFavoritesPointDeclinedUpdated
} from './actions';

import { CommonActionTypes, ResetFavorites } from '../actions';
import { SelectChoices } from '../scenario/actions';
import { tryCatch } from '../error.action';

import { FavoriteService } from '../../core/services/favorite.service';

import * as fromRoot from '../reducers';
import * as fromFavorite from './reducer';
import { MyFavoritesPointDeclined } from '../../shared/models/my-favorite.model';

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
						// get favorites locations
						let attributes = c.myFavoritesChoiceLocations ? _.flatten(c.myFavoritesChoiceLocations.map(l =>
							{
								return l.myFavoritesChoiceLocationAttributes && l.myFavoritesChoiceLocationAttributes.length ? l.myFavoritesChoiceLocationAttributes.map(a =>
								{
									return <DesignToolAttribute>{
										attributeId: a.attributeCommunityId,
										attributeGroupId: a.attributeGroupCommunityId,
										scenarioChoiceLocationId: l.id,
										scenarioChoiceLocationAttributeId: a.id,
										locationGroupId: l.locationGroupCommunityId,
										locationId: l.locationCommunityId,
										locationQuantity: l.quantity,
										attributeGroupLabel: a.attributeGroupLabel,
										attributeName: a.attributeName,
										locationGroupLabel: l.locationGroupLabel,
										locationName: l.locationName,
										sku: null,
										manufacturer: null
									};
								}) : [<DesignToolAttribute>{
									locationGroupId: l.locationGroupCommunityId,
									locationGroupLabel: l.locationGroupLabel,
									locationId: l.locationCommunityId,
									locationName: l.locationName,
									locationQuantity: l.quantity
								}];
							})) : [];
			
						// gets favorites attributes
						c.myFavoritesChoiceAttributes && c.myFavoritesChoiceAttributes.forEach(a =>
						{
							attributes.push({
								attributeId: a.attributeCommunityId,
								attributeGroupId: a.attributeGroupCommunityId,
								scenarioChoiceLocationId: a.id,
								attributeGroupLabel: a.attributeGroupLabel,
								attributeName: a.attributeName,
								sku: null,
								manufacturer: null
							} as DesignToolAttribute);
						});

						return {
							choiceId: c.dpChoiceId,
							quantity: c.dpChoiceQuantity,
							attributes: attributes
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
	resetFavorites$: Observable<Action> = this.actions$.pipe(
		ofType<ResetFavorites>(CommonActionTypes.ResetFavorites),
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
								quantity: 0,
								attributes: []
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
                return this.favoriteService.saveMyFavoritesChoices(store.scenario.tree, store.favorite.salesChoices, fav);
  			}),
			switchMap(results => of(new MyFavoritesChoicesSaved(results)))
		), SaveError, "Error saving my favorite choices!")
	);

	@Effect()
	addMyFavoritesPointDeclined$: Observable<Action> = this.actions$.pipe(
		ofType<AddMyFavoritesPointDeclined>(FavoriteActionTypes.AddMyFavoritesPointDeclined),
		tryCatch(source => source.pipe(
			switchMap(action => {
                return this.favoriteService.addMyFavoritesPointDeclined(action.myFavoriteId, action.pointId);
  			}),
			map(results => new MyFavoritesPointDeclinedUpdated(results, false))
		), SaveError, "Error adding my favorites point declined!")
	);
	
	@Effect()
	deleteMyFavoritesPointDeclined$: Observable<Action> = this.actions$.pipe(
		ofType<DeleteMyFavoritesPointDeclined>(FavoriteActionTypes.DeleteMyFavoritesPointDeclined),
		tryCatch(source => source.pipe(
			switchMap(action => {
                return this.favoriteService.deleteMyFavoritesPointDeclined(action.myFavoriteId, action.myFavoritesPointDeclineId);
  			}),
			map(results => new MyFavoritesPointDeclinedUpdated(results, true))
		), SaveError, "Error deleting my favorites point declined!")
	);

	@Effect()
	deleteMyFavorites$: Observable<Action> = this.actions$.pipe(
		ofType<DeleteMyFavorite>(FavoriteActionTypes.DeleteMyFavorite),
		tryCatch(source => source.pipe(
			switchMap(action => {
                return this.favoriteService.deleteMyFavorite(action.myFavorite);
  			}),
			switchMap(result => of(new MyFavoriteDeleted(result)))
		), SaveError, "Error deleting my favorite!")
	);

}
