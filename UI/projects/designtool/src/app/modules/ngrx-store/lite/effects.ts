import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, never, of, combineLatest, from } from 'rxjs';
import { switchMap, withLatestFrom, map } from 'rxjs/operators';

import { LiteService } from '../../core/services/lite.service';
import { DeselectPlan, PlanActionTypes, PlansLoaded, SelectPlan } from '../plan/actions';
import { ScenarioActionTypes, ScenarioSaved } from '../scenario/actions';
import {
	LiteActionTypes, SetIsPhdLite, LiteOptionsLoaded, SaveScenarioOptions, ScenarioOptionsSaved, SaveScenarioOptionColors, OptionCategoriesLoaded, SelectOptions,
	LoadLiteMonotonyRules, LiteMonotonyRulesLoaded
} from './actions';
import { CommonActionTypes, ScenarioLoaded, SalesAgreementLoaded, LoadError } from '../actions';
import * as fromRoot from '../reducers';
import * as _ from 'lodash';
import { IOptionCategory, ScenarioOption } from '../../shared/models/lite.model';
import { tryCatch } from '../error.action';

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
					const salesCommunityId = store.opportunity.opportunityContactAssoc.opportunity.salesCommunityId;

					let actions = [];
					actions.push(new SetIsPhdLite(isPhdLite));

					if (isPhdLite) 
					{
						actions.push(new LoadLiteMonotonyRules(salesCommunityId));
					}

					return from(actions);
				}

				return never();
			})
		);
	});

	loadOptions$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<ScenarioSaved | ScenarioLoaded>(ScenarioActionTypes.ScenarioSaved, CommonActionTypes.ScenarioLoaded),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
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
							: of(null);

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
						return never();
					}
				}),
				switchMap(data => {
					if (data)
					{
						return from([new LiteOptionsLoaded(data.options, data.scenarioOptions), new OptionCategoriesLoaded(data.categories)]);
					}
					return never();
				})
			), LoadError, "Unable to load options")
		);
	});

	loadSalesAgreementOptions$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<SalesAgreementLoaded>(CommonActionTypes.SalesAgreementLoaded),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) => {
					if (!action.tree)
					{
						return combineLatest([
							this.liteService.getLitePlanOptions(action.job.planId),
							this.liteService.getOptionsCategorySubcategory(action.job.financialCommunityId)
						]).pipe(
							switchMap(([options, optionsForCategories]) => {
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

										const scenarioOptions = this.liteService.getSelectedOptions(options, action.job, action.changeOrder);
										
										return { options, scenarioOptions, categories };
									})
								)
							})
						);
					}
					else
					{
						return never();
					}
				}),
				switchMap(data => {
					if (data)
					{
						return from([new LiteOptionsLoaded(data.options, data.scenarioOptions), new OptionCategoriesLoaded(data.categories)]);
					}
					return never();
				})
			), LoadError, "Unable to load options")	
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

	planWasSelectedOrDeselected$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<LiteOptionsLoaded | SelectPlan | DeselectPlan>(LiteActionTypes.LiteOptionsLoaded, PlanActionTypes.SelectPlan, PlanActionTypes.DeselectPlan),
			withLatestFrom(this.store),
			switchMap(([action, store]) => {
				if (store.lite.options.length === 0)
				{
					return never();
				}

				const baseHouseOption = store.lite.options.find(o => o.name.toLowerCase() === 'base house'
												&& o.isActive
												&& o.colorItems.length > 0
												&& o.colorItems.some(item => item.isActive && item.color.length > 0 && item.color.some(c => c.isActive)));

				const baseHouseOptionSaveIsNeeded = baseHouseOption && store.lite.scenarioOptions.every(so => so.edhPlanOptionId !== baseHouseOption.id);

				if (baseHouseOptionSaveIsNeeded)
				{
					let baseHouseScenarioOptions: ScenarioOption[] = [{
							scenarioOptionId: 0,
							scenarioId: store.scenario.scenario.scenarioId,
							edhPlanOptionId: baseHouseOption.id,
							planOptionQuantity: 1,
							scenarioOptionColors: []
						}];

					return from([
						new SelectOptions(baseHouseScenarioOptions),
						new SaveScenarioOptions(baseHouseScenarioOptions)
					]);
				}

				return never();
			})
		);
	});

	loadLiteMonotonyRules$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<LoadLiteMonotonyRules>(LiteActionTypes.LoadLiteMonotonyRules),
			tryCatch(source => source.pipe(
				switchMap(action => this.liteService.getMonotonyRulesForLiteSalesCommunity(action.salesCommunityId, false)),
				map(monotonyRules => new LiteMonotonyRulesLoaded(monotonyRules))
			), LoadError, "Error loading lite monotony rules!")
		);
	});

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private liteService: LiteService
	) { }
}
