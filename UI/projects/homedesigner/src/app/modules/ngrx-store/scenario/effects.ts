import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';

import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

import { ScenarioActionTypes, SelectChoices, SetStatusForPointsDeclined } from './actions';
import * as fromRoot from '../reducers';
import * as fromFavorite from '../favorite/reducer';
import * as _ from 'lodash';
import { DeleteMyFavoritesPointDeclined } from '../favorite/actions';
import { from } from 'rxjs';

@Injectable()
export class ScenarioEffects
{
	selectChoices$: Observable<Action> = createEffect(() => 
		this.actions$.pipe(
			ofType<SelectChoices>(ScenarioActionTypes.SelectChoices),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree)), this.store.pipe(select(fromFavorite.currentMyFavorite))),
			switchMap(([action, tree, fav]) =>
			{
				if (fav?.myFavoritesPointDeclined?.length)
				{
					let subGroups = _.flatMap(tree.groups, g => g.subGroups);
					let disabledPoints = _.flatMap(subGroups, sg => sg.points).filter(p => !p.enabled);
					let completedDeclinePoints = [];
					let actions = [];
					fav.myFavoritesPointDeclined.forEach(mfpd => {
						let disabledDeclinedPoint = disabledPoints.find(dp => dp.divPointCatalogId === mfpd.divPointCatalogId);
						if (disabledDeclinedPoint) {
							actions.push(new DeleteMyFavoritesPointDeclined(fav.id, mfpd.id));
						} else {
							completedDeclinePoints.push(mfpd.divPointCatalogId);
						}
					})
					actions.push(new SetStatusForPointsDeclined(completedDeclinePoints, false));
					return from(actions);
				}
				else
				{
					return new Observable<never>();
				}
			})
		)
	);

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>) { }
}
