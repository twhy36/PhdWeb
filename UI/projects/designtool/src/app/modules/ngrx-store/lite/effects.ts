import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, never, of, combineLatest, from } from 'rxjs';
import { switchMap, withLatestFrom, map } from 'rxjs/operators';

import { LiteService } from '../../core/services/lite.service';
import { PlanActionTypes, PlansLoaded } from '../plan/actions';
import { ScenarioActionTypes, ScenarioSaved } from '../scenario/actions';
import {
	LiteActionTypes, SetIsPhdLite, LiteOptionsLoaded, SaveScenarioOptions, ScenarioOptionsSaved, SaveScenarioOptionColors, OptionCategoriesLoaded
} from './actions';
import { CommonActionTypes, ScenarioLoaded } from '../actions';
import * as fromRoot from '../reducers';
import * as _ from 'lodash';
import { IOptionCategory } from '../../shared/models/lite.model';

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
			ofType<ScenarioSaved | ScenarioLoaded>(ScenarioActionTypes.ScenarioSaved, CommonActionTypes.ScenarioLoaded),
			withLatestFrom(this.store),
			switchMap(([action, store]) => {
				const planOptions = store.lite.options;
				const optionsLoaded = !!planOptions.find(option => option.planId === action.scenario.planId);
				const isPhdLite = action instanceof ScenarioLoaded ? !action.scenario.treeVersionId : store.lite.isPhdLite;

				if (isPhdLite && !optionsLoaded)
				{
					const financialCommunityId = action instanceof ScenarioLoaded
						? action.scenario?.financialCommunityId
						: store.plan.plans?.find(p => p.id === store.plan.selectedPlan)?.communityId;

					const getOptionsCategorySubcategory = !!financialCommunityId
						? this.liteService.getOptionsCategorySubcategory(financialCommunityId)
						: null;

					return combineLatest([
						this.liteService.getLitePlanOptions(action.scenario.planId),
						this.liteService.getScenarioOptions(action.scenario.scenarioId),
						getOptionsCategorySubcategory
					]).pipe(
						switchMap(([options, scenarioOptions, optionsForCategories]) => {
							let categories: IOptionCategory[] = [];

							if (optionsForCategories)
							{
								let groups = _.groupBy(optionsForCategories, sc => sc.optionCategory.id);
								categories = Object.keys(groups).map(g => ({
									...groups[g][0].optionCategory,
									optionSubCategories: groups[g].map(sc => ({ ...sc, optionCategory: undefined }))
								})).sort((category1,category2) => {
									return category1.name > category2.name ? 1 : -1;
								});
							}

							const optionIds = options.map(o => o.id);
							const optionCommunityIds = _.uniq(options.map(o => o.optionCommunityId));

							return combineLatest([
								this.liteService.getColorItems(optionIds),
								this.liteService.getOptionRelations(optionCommunityIds)
							]).pipe(
								map(([colorItems, optionRelations]) => {
									colorItems.forEach(colorItem => {
										let option = options.find(option => option.id === colorItem.edhPlanOptionId);
										if (option)
										{
											option.colorItems.push(colorItem);
										}
									});

									this.liteService.applyOptionRelations(options, optionRelations);

									return { options, scenarioOptions, categories };
								})
							)
						})
					);
				}
				else
				{
					return null;
				}
			}),
			switchMap(data => {
				if (data)
				{
					return from([new LiteOptionsLoaded(data.options, data.scenarioOptions), new OptionCategoriesLoaded(data.categories)]);
				}
				return never();
			})
		);
	});


	saveScenarioOptions$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<SaveScenarioOptions>(LiteActionTypes.SaveScenarioOptions),
			withLatestFrom(this.store),
			switchMap(([action, store]) => {
				const scenarioId = store.scenario.scenario?.scenarioId;

				return scenarioId
					? this.liteService.saveScenarioOptions(scenarioId, action.scenarioOptions)
					: of([]);
			}),
			map(options => new ScenarioOptionsSaved(options))
		);
	});

	saveScenarioOptionColors$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<SaveScenarioOptionColors>(LiteActionTypes.SaveScenarioOptionColors),
			withLatestFrom(this.store),
			switchMap(([action, store]) => {
				const scenarioId = store.scenario.scenario?.scenarioId;

				return scenarioId
					? this.liteService.saveScenarioOptionColors(scenarioId, action.optionColors)
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
