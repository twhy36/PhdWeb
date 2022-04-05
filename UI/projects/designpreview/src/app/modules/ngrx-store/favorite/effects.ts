import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable, of, from } from 'rxjs';
import { switchMap, withLatestFrom, map, tap } from 'rxjs/operators';

import * as _ from 'lodash';

import { DesignToolAttribute, MyFavorite, PickType } from 'phd-common';

import
{ 	FavoriteActionTypes, SetCurrentFavorites, MyFavoriteCreated, SaveMyFavoritesChoices,
	MyFavoritesChoicesSaved, SaveError, DeleteMyFavorite, MyFavoriteDeleted,
	AddMyFavoritesPointDeclined, DeleteMyFavoritesPointDeclined, MyFavoritesPointDeclinedUpdated,
	LoadMyFavorite,	MyFavoriteLoaded, LoadDefaultFavorite, MyFavoritesChoicesDeleted,
	DeleteMyFavoritesChoiceAttributes
} from './actions';

import { CommonActionTypes, ResetFavorites, SalesAgreementLoaded, MyFavoritesChoiceAttributesDeleted } from '../actions';
import { SelectChoices, SetStatusForPointsDeclined } from '../scenario/actions';
import { tryCatch } from '../error.action';

import { FavoriteService } from '../../core/services/favorite.service';
import { TreeService } from '../../core/services/tree.service';

import * as fromRoot from '../reducers';
import * as fromFavorite from './reducer';
import * as fromSalesAgreement from '../sales-agreement/reducer';
import { AdobeService } from '../../core/services/adobe.service';

@Injectable()
export class FavoriteEffects
{
	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private favoriteService: FavoriteService,
		private adobeService: AdobeService,
		private treeService: TreeService
	) { }

	setCurrentFavorites$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<SetCurrentFavorites | MyFavoriteCreated>(FavoriteActionTypes.SetCurrentFavorites, FavoriteActionTypes.MyFavoriteCreated),
			withLatestFrom(this.store, this.store.pipe(select(fromFavorite.currentMyFavorite))),
			tryCatch(source => source.pipe(
				switchMap(([action, store, fav]) => {
					const isDesignComplete = store.salesAgreement?.isDesignComplete || false;
					let actions: any[] = [];

					if (fav?.myFavoritesChoice?.length)
					{
						const points = _.flatMap(store.scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
						const favoriteChoices = fav.myFavoritesChoice.filter(c => {
							const point = points.find(pt => pt.choices.some(ch => ch.divChoiceCatalogId === c.divChoiceCatalogId));

							// Ignore the favorited choice if 
							//   - the choice is contracted or 
							//   - the point has pick type (Pick0or1 or Pick1) and there is a contracted choice in the point
							let choiceSelected = true;
							if (!!store.favorite?.salesChoices?.find(x => x.divChoiceCatalogId === c.divChoiceCatalogId)) 
							{
								choiceSelected = false;
							}
							else if ((point?.pointPickTypeId === PickType.Pick0or1 || point?.pointPickTypeId === PickType.Pick1)
								&& !!store.favorite?.salesChoices?.find(x => point.choices.some(ch => ch.divChoiceCatalogId === x.divChoiceCatalogId)))
							{
								choiceSelected = false;
							}

							return choiceSelected;
						});

						let choices = favoriteChoices.map(c => {
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
								divChoiceCatalogId: c.divChoiceCatalogId,
								quantity: c.dpChoiceQuantity,
								attributes: attributes
							};
						});

						actions.push(new SelectChoices(isDesignComplete, ...choices));
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
			withLatestFrom(this.store.pipe(select(fromFavorite.currentMyFavorite)),
				this.store.pipe(select(state => state.salesAgreement))),
			tryCatch(source => source.pipe(
				switchMap(([action, fav, sag]) => {
					if (fav)
					{
						let actions: any[] = [ new SetCurrentFavorites(null) ];

						if (fav.myFavoritesChoice?.length)
						{
							let choices = fav.myFavoritesChoice.map(c => {
								return {
									choiceId: c.dpChoiceId,
									divChoiceCatalogId: c.divChoiceCatalogId,
									quantity: 0,
									attributes: []
								};
							});

							const isDesignComplete = sag?.isDesignComplete || false;
							actions.push(new SelectChoices(isDesignComplete, ...choices));
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

	pushAdobeFavoriteEvent$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<SaveMyFavoritesChoices>(FavoriteActionTypes.SaveMyFavoritesChoices),
			withLatestFrom(this.store, this.store.pipe(select(fromFavorite.currentMyFavorite))),
			tryCatch(source => source.pipe(
				switchMap(([preSaveAction, store, fav]) => {
					return this.actions$.pipe(
						ofType<MyFavoritesChoicesSaved>(FavoriteActionTypes.MyFavoritesChoicesSaved),
						tap((postSaveAction) => {
							this.adobeService.packageFavoriteEventData(postSaveAction.choices, fav, store.scenario.tree, store.scenario.tree.treeVersion.groups, store.favorite.salesChoices)
						})
					)
				}),
				switchMap(results => {
					return new Observable<never>()
				})
			), SaveError, "Error pushing favorite to Adobe!")
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
				this.store.pipe(select(fromRoot.favoriteTitle))
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

	loadDefaultFavorite$: Observable<Action> = createEffect(() => 
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

	updateMyFavoritesChoicesOnInit$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<SalesAgreementLoaded>(CommonActionTypes.SalesAgreementLoaded),
			tryCatch(source => source.pipe(
				switchMap(action => {
					const choices = _.flatMap(action.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));
					const favChoices = action.myFavorites ? _.flatMap(action.myFavorites, fav => fav.myFavoritesChoice) : [];
					const removedFavChoices = favChoices.filter(favChoice => !choices.find(c => c.divChoiceCatalogId === favChoice.divChoiceCatalogId));

					return !!removedFavChoices?.length
						? this.favoriteService.deleteMyFavoritesChoices(removedFavChoices)
						: of([]);
				}),
				switchMap(results => of(new MyFavoritesChoicesDeleted(results)))
			), SaveError, "Error updating my favorite choices on init!")
		)
	);	

	deleteMyFavoritesChoiceAttributes$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<DeleteMyFavoritesChoiceAttributes>(FavoriteActionTypes.DeleteMyFavoritesChoiceAttributes),
			tryCatch(source => source.pipe(
				switchMap(action => {
					return this.favoriteService.deleteMyFavoritesAttributes(action.attributes, action.locations, action.myFavoritesChoice).pipe(
						map(result => {
							return { attributes: action.attributes, locations: action.locations, myFavoritesChoice: action.myFavoritesChoice };
						})
					);
				}),
				switchMap(results => of(new MyFavoritesChoiceAttributesDeleted(results.attributes, results.locations, results.myFavoritesChoice)))
			), SaveError, "Error deleting favorites choice attributes!")
		)
	);		
}
