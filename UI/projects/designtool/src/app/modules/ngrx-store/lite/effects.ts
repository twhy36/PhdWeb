import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, never, of } from 'rxjs';
import { switchMap, withLatestFrom } from 'rxjs/operators';

import { PlanActionTypes, PlansLoaded } from '../plan/actions';
import { SetIsPhdLite } from './actions';
import * as fromRoot from '../reducers';

@Injectable()
export class LiteEffects
{
	setIsPhdLite$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<PlansLoaded>(PlanActionTypes.PlansLoaded),
			withLatestFrom(this.store),
			switchMap(([action, store]) => {
				const isPreview = store.scenario?.buildMode === 'preview';

				if (!isPreview)
				{
					const isPhdLite = action.plans.some(plan => !plan.treeVersionId);

					return of(new SetIsPhdLite(isPhdLite));
				}

				return never();
			})
		);
	});

	constructor(private actions$: Actions, private store: Store<fromRoot.State>) { }
}
