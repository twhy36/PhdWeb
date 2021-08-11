import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { from } from 'rxjs/observable/from';

import * as _ from 'lodash';

import { DesignToolAttribute, MyFavorite } from 'phd-common';

import
{ 	FavoriteActionTypes, SetCurrentFavorites, MyFavoriteCreated, SaveMyFavoritesChoices,
	MyFavoritesChoicesSaved, SaveError, DeleteMyFavorite, MyFavoriteDeleted,
	AddMyFavoritesPointDeclined, DeleteMyFavoritesPointDeclined, MyFavoritesPointDeclinedUpdated,
	LoadMyFavorite,	MyFavoriteLoaded, LoadDefaultFavorite
} from './actions';

import { CommonActionTypes, ResetFavorites } from '../actions';
import { SelectChoices, SetStatusForPointsDeclined } from '../scenario/actions';
import { tryCatch } from '../error.action';

import { FavoriteService } from '../../core/services/favorite.service';
import { TreeService } from '../../core/services/tree.service';

import * as fromRoot from '../reducers';
import * as fromFavorite from './reducer';
import * as fromSalesAgreement from '../sales-agreement/reducer';

@Injectable()
export class FavoriteEffects
{
	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private favoriteService: FavoriteService,
		private treeService: TreeService
	) { }

	setCurrentFavorites$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<SetCurrentFavorites | MyFavoriteCreated>(FavoriteActionTypes.SetCurrentFavorites, FavoriteActionTypes.MyFavoriteCreated),
			withLatestFrom(this.store.pipe(select(fromFavorite.currentMyFavorite))),
			tryCatch(source => source.pipe(
				switchMap(([action, fav]) => {
					let actions: any[] = [];

					if (fav?.myFavoritesChoice?.length)
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

						actions.push(new SelectChoices(...choices));
					}
					else if (fav?.myFavoritesPointDeclined?.length)
					{
						const pointIds = fav.myFavoritesPointDeclined.map(x => x.divPointCatalogId);
						actions.push(new SetStatusForPointsDeclined(pointIds, false));
					}

					if (actions.length)
					{
						return from(actions);
					}
					else
					{
						return new Observable<never>();
					}
				})
			), SaveError, "Error setting current favorites!")
		)
	);

	resetFavorites$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<ResetFavorites>(CommonActionTypes.ResetFavorites),
			withLatestFrom(this.store.pipe(select(fromFavorite.currentMyFavorite))),
			tryCatch(source => source.pipe(
				switchMap(([action, fav]) => {
					if (fav)
					{
						let actions: any[] = [ new SetCurrentFavorites(null) ];

						if (fav.myFavoritesChoice?.length)
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

						if (fav.myFavoritesPointDeclined?.length)
						{
							const pointIds = fav.myFavoritesPointDeclined.map(x => x.divPointCatalogId);
							actions.push(new SetStatusForPointsDeclined(pointIds, true));
						}

						return from(actions);
					}
					else
					{
						return new Observable<never>();
					}
				})
			), SaveError, "Error resetting current favorites!")
		)
	);

	saveMyFavoritesChoices$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<SaveMyFavoritesChoices>(FavoriteActionTypes.SaveMyFavoritesChoices),
			withLatestFrom(this.store, this.store.pipe(select(fromFavorite.currentMyFavorite))),
			tryCatch(source => source.pipe(
				switchMap(([action, store, fav]) => {
					return store.scenario.buildMode === 'preview'
						? this.favoriteService.saveMyFavoritesChoicesInPreview(store.scenario.tree, fav)
						: this.favoriteService.saveMyFavoritesChoices(store.scenario.tree, store.favorite.salesChoices, fav);
				}),
				switchMap(results => of(new MyFavoritesChoicesSaved(results)))
			), SaveError, "Error saving my favorite choices!")
		)
	);

	addMyFavoritesPointDeclined$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<AddMyFavoritesPointDeclined>(FavoriteActionTypes.AddMyFavoritesPointDeclined),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) => {
					if (store.scenario.buildMode === 'preview')
					{
						return of([{
							id: -action.pointId,
							myFavoriteId: action.myFavoriteId,
							dPointId: action.pointId,
							divPointCatalogId: action.divPointCatalogId							
						}]);
					}
					else
					{
						return this.favoriteService.addMyFavoritesPointDeclined(action.myFavoriteId, action.pointId).pipe(
							switchMap(pointDeclined => {
								return this.treeService.getPointCatalogIds([pointDeclined]);
							})
						);
					}
				}),
				switchMap(results => {
					return results?.length
						? of(new MyFavoritesPointDeclinedUpdated(results[0], false))
						: new Observable<never>();
				})
			), SaveError, "Error adding my favorites point declined!")
		)
	);

	deleteMyFavoritesPointDeclined$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<DeleteMyFavoritesPointDeclined>(FavoriteActionTypes.DeleteMyFavoritesPointDeclined),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) => {
					if (store.scenario.buildMode === 'preview')
					{
						const myFavorite = store.favorite?.myFavorites?.find(fav => fav.id === action.myFavoriteId);
						const pointDeclined = myFavorite?.myFavoritesPointDeclined?.find(pt => pt.id === action.myFavoritesPointDeclineId);
						return of(pointDeclined);
					}
					else
					{
						return this.favoriteService.deleteMyFavoritesPointDeclined(action.myFavoriteId, action.myFavoritesPointDeclineId);
					}
				}),
				map(results => new MyFavoritesPointDeclinedUpdated(results, true))
			), SaveError, "Error deleting my favorites point declined!")
		)
	);

	deleteMyFavorites$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<DeleteMyFavorite>(FavoriteActionTypes.DeleteMyFavorite),
			tryCatch(source => source.pipe(
				switchMap(action => {
					return this.favoriteService.deleteMyFavorite(action.myFavorite);
				}),
				switchMap(result => of(new MyFavoriteDeleted(result)))
			), SaveError, "Error deleting my favorite!")
		)
	);

	loadMyFavorite$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<LoadMyFavorite>(FavoriteActionTypes.LoadMyFavorite),
			withLatestFrom(this.store.pipe(select(fromSalesAgreement.salesAgreementState)),
				this.store.pipe(select(fromFavorite.favoriteState)),
				this.store.pipe(select(fromSalesAgreement.favoriteTitle))
			),
			tryCatch(source => source.pipe(
				switchMap(([action, sag, fav, title]) => {
					const salesAgreementId = sag?.id || 0;
					const currentMyFavorite = fav?.myFavorites?.length > 0 ? fav.myFavorites[0] : null;
					const selectedFavoritesId = fav?.selectedFavoritesId || 0;
					const getMyFavorite = currentMyFavorite ? of(currentMyFavorite) : this.favoriteService.saveMyFavorite(0, title, salesAgreementId);

					return getMyFavorite.pipe(
						map(favorite => {
							return { favorite: favorite, currentMyFavorite: currentMyFavorite, selectedFavoritesId: selectedFavoritesId };
						})
					);
				}),
				switchMap(result => {
					let actions: any[] = [];

					if (result.favorite)
					{
						if (!result.currentMyFavorite)
						{
							actions.push(new MyFavoriteCreated(result.favorite));
						}

						if (result.selectedFavoritesId !== result.favorite.id)
						{
							actions.push(new SetCurrentFavorites(result.favorite.id));

							if (result.favorite.myFavoritesPointDeclined?.length)
							{
								actions.push(new SetStatusForPointsDeclined(result.favorite.myFavoritesPointDeclined.map(dp => dp.divPointCatalogId), false));
							}
						}

						actions.push(new MyFavoriteLoaded());
					}

					return from(actions);
				})
			), SaveError, "Error loading my favorite!")
		)
	);

	LoadDefaultFavorite$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<LoadDefaultFavorite>(FavoriteActionTypes.LoadDefaultFavorite),
			withLatestFrom(this.store.pipe(select(fromFavorite.favoriteState))),
			tryCatch(source => source.pipe(
				switchMap(([action, fav]) => {
					const currentMyFavorite = fav?.myFavorites?.length > 0 ? fav.myFavorites[0] : null;
					const selectedFavoritesId = fav?.selectedFavoritesId || 0;
					const defaultFavorite: MyFavorite = {
						id: -1,
						name: 'Default Favorite',
						salesAgreementId: -1,
						myFavoritesChoice: [],
						myFavoritesPointDeclined: []
					};
					const favorite = currentMyFavorite ? currentMyFavorite : defaultFavorite;

					return of({ favorite: favorite, currentMyFavorite: currentMyFavorite, selectedFavoritesId: selectedFavoritesId });
			}),
				switchMap(result => {
					let actions: any[] = [];

					if (result.favorite)
					{
						if (!result.currentMyFavorite)
						{
							actions.push(new MyFavoriteCreated(result.favorite));
						}

						if (result.selectedFavoritesId !== result.favorite.id)
						{
							actions.push(new SetCurrentFavorites(result.favorite.id));

							if (result.favorite.myFavoritesPointDeclined?.length)
							{
								actions.push(new SetStatusForPointsDeclined(result.favorite.myFavoritesPointDeclined.map(dp => dp.divPointCatalogId), false));
							}
						}

						actions.push(new MyFavoriteLoaded());
					}

					return from(actions);
				})
			), SaveError, "Error loading my favorite!")
		)
	);
}
