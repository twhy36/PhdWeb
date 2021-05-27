import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';

import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

import { ScenarioActionTypes, SelectChoices, SetStatusForPointsDeclined } from './actions';
import * as fromRoot from '../reducers';
import * as fromFavorite from '../favorite/reducer';

@Injectable()
export class ScenarioEffects
{
	@Effect()
	selectChoices$: Observable<Action> = this.actions$.pipe(
		ofType<SelectChoices>(ScenarioActionTypes.SelectChoices),
		withLatestFrom(this.store.pipe(select(fromFavorite.currentMyFavorite))),
		switchMap(([action, fav]) =>
		{
			if (fav?.myFavoritesPointDeclined?.length)
			{
				const pointIds = fav.myFavoritesPointDeclined.map(x => x.divPointCatalogId);
				return of(new SetStatusForPointsDeclined(pointIds, false));
			}
			else
			{
				return new Observable<never>();
			}
		})
	);

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>) { }
}
