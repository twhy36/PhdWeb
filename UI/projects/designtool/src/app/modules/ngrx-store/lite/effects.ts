import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable  } from 'rxjs';
import { map } from 'rxjs/operators';

import { PlanActionTypes, PlansLoaded } from '../plan/actions';
import { SetIsPhdLite } from './actions';

@Injectable()
export class LiteEffects
{
	setIsPhdLite$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<PlansLoaded>(PlanActionTypes.PlansLoaded),
			map(action => {
				const isPhdLite = action.plans.some(plan => !plan.treeVersionId);

				return new SetIsPhdLite(isPhdLite);
			})
		);
	});

	constructor(private actions$: Actions) { }
}
