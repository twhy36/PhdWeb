import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { PlanActionTypes, LoadSelectedPlan, SelectedPlanLoaded, LoadError } from './actions';
import { tryCatch } from '../error.action';

import { PlanService } from '../../core/services/plan.service';

@Injectable()
export class PlanEffects
{
	constructor(private actions$: Actions,
		private planService: PlanService
	) { }

	@Effect()
	loadSelectedPlan$: Observable<Action> = this.actions$.pipe(
		ofType<LoadSelectedPlan>(PlanActionTypes.LoadSelectedPlan),
		tryCatch(source => source.pipe(
			switchMap(action => this.planService.getSelectedPlan(action.planId)),
			map(plans => new SelectedPlanLoaded(plans))
		), LoadError, "Error loading selected plan!!")
	);
}
