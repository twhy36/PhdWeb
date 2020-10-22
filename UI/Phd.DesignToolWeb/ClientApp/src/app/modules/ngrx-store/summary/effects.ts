import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom, share, combineLatest, flatMap, map, take, delay } from 'rxjs/operators';
import { from } from 'rxjs/observable/from';

import * as _ from 'lodash';

import * as fromRoot from '../reducers';

import { SummaryActionTypes, SetHanding } from './actions';
import { SetChangeOrderHanding, SavePendingJio } from '../change-order/actions';
import { SelectHanding } from '../lot/actions';
import { SetScenarioLotHanding } from '../scenario/actions';

@Injectable()
export class SummaryEffects
{
	@Effect()
	setHanding$: Observable<Action> = this.actions$.pipe(
		ofType<SetHanding>(SummaryActionTypes.SetHanding),
		withLatestFrom(this.store),
		switchMap(([action, store]) => {
			const actions = [];

			if (store.changeOrder.isChangingOrder) {
				actions.push(new SetChangeOrderHanding(action.handing));
			} else if (!!store.salesAgreement.id && store.salesAgreement.status === 'Pending') {
				actions.push(new SavePendingJio(action.handing));
			} else if (store.scenario.scenario) {
				actions.push(new SelectHanding(action.lotId, action.handing.handing));
				actions.push(new SetScenarioLotHanding(action.handing));
			}

			return from(actions);
		})
	);

	constructor(private actions$: Actions, private store: Store<fromRoot.State>) { }
}
