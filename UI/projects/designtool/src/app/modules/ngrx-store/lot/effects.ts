import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

import { LotService } from '../../core/services/lot.service';
import { LotActionTypes, LoadLots, LotsLoaded, LoadError, SelectLot, SelectedLotLoaded, LoadMonotonyRules, MonotonyRulesLoaded } from './actions';
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

	loadLots$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<LoadLots>(LotActionTypes.LoadLots),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) => {
					// use scenario lotId in case selected lot is not set.
					let selectedLotId = store.lot.selectedLot
						? store.lot.selectedLot.id
						: (store.scenario.scenario && store.scenario.scenario.lotId ? store.scenario.scenario.lotId : null);

					return this.lotService.loadLots(action.salesCommunityId, selectedLotId, false, action.isModel);
				}),
				switchMap(results => of(new LotsLoaded(results)))
			), LoadError, "Error loading lots!!")
		);
	});

	selectLot$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<SelectLot>(LotActionTypes.SelectLot),
			tryCatch(source => source.pipe(
				switchMap(action => this.lotService.getLot(action.id)),
				map(lot => new SelectedLotLoaded(lot))
			), LoadError, "Error loading lot!")
		);
	});

	loadMonotonyRules$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<LoadMonotonyRules>(LotActionTypes.LoadMonotonyRules),
			tryCatch(source => source.pipe(
				switchMap(action => this.lotService.getMonotonyRulesForSalesCommunity(action.salesCommunityId, false)),
				map(monotonyRules => new MonotonyRulesLoaded(monotonyRules))
			), LoadError, "Error loading monotony rules!")
		);
	});
}
