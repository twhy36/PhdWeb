import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

import { LotService } from '../../core/services/lot.service';
import { LotActionTypes, LoadLots, LotsLoaded, LoadError } from './actions';
import { tryCatch } from '../error.action';

import * as fromRoot from '../reducers';

@Injectable()
export class LotEffects
{
	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private lotService: LotService
	) { }

	@Effect()
	loadLots$: Observable<Action> = this.actions$.pipe(
		ofType<LoadLots>(LotActionTypes.LoadLots),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) => {
				let selectedLotId = store.lot.selectedLot ? store.lot.selectedLot.id : null;

				return this.lotService.loadLots(action.salesCommunityId, selectedLotId, false);
			}),
			switchMap(results => of(new LotsLoaded(results)))
		), LoadError, "Error loading lots!!")
	);
}
