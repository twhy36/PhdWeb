import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, never, of, combineLatest } from 'rxjs';
import { switchMap, withLatestFrom, map } from 'rxjs/operators';

import { LiteService } from '../../core/services/lite.service';
import { PlanActionTypes, PlansLoaded } from '../plan/actions';
import { ScenarioActionTypes, ScenarioSaved } from '../scenario/actions';
import { LiteActionTypes, SetIsPhdLite, LiteOptionsLoaded, SaveScenarioOptions, ScenarioOptionsSaved } from './actions';
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

	loadOptions$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<ScenarioSaved>(ScenarioActionTypes.ScenarioSaved),
			withLatestFrom(this.store),
			switchMap(([action, store]) => {
				const planOptions = store.lite.options;
				const optionsLoaded = !!planOptions.find(option => option.planId === action.scenario.planId);
				
				if (store.lite.isPhdLite && !optionsLoaded)
				{
					return combineLatest([
						this.liteService.getLitePlanOptions(action.scenario.planId),
						this.liteService.getScenarioOptions(action.scenario.scenarioId)
					]).pipe(
						map(([options, scenarioOptions]) => {
							scenarioOptions.forEach(scenarioOption => {
								let option = options.find(opt => opt.id === scenarioOption.edhPlanOptionId);
								if (option)
								{
									option.scenarioOption = scenarioOption;
								}
							})
							return options;
						})
					);
				}
				else
				{
					return of(store.lite.isPhdLite ? planOptions : []);
				}
			}),
			map(options => new LiteOptionsLoaded(options))
		);
	});	

	saveScenarioOptions$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<SaveScenarioOptions>(LiteActionTypes.SaveScenarioOptions),
			withLatestFrom(this.store),
			switchMap(([action, store]) => {
				const scenarioId = store.scenario.scenario?.scenarioId;
				const opportunityId = store.scenario.scenario?.opportunityId;

				return scenarioId && opportunityId
					? this.liteService.saveScenarioOptions(scenarioId, opportunityId, action.options)
					: of([]);
			}),
			map(options => new ScenarioOptionsSaved(options))
		);
	});	

	constructor(
		private actions$: Actions, 
		private store: Store<fromRoot.State>,
		private liteService: LiteService
	) { }
}
