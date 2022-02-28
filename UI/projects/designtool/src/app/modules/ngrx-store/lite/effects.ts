import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable, never, of, combineLatest, from, EMPTY as empty } from 'rxjs';
import { switchMap, withLatestFrom, map, scan, filter, distinct } from 'rxjs/operators';

import { LiteService } from '../../core/services/lite.service';
import { DeselectPlan, PlanActionTypes, PlansLoaded, SelectPlan } from '../plan/actions';
import { ScenarioActionTypes, ScenarioSaved } from '../scenario/actions';
import {
	LiteActionTypes, SetIsPhdLite, LiteOptionsLoaded, SaveScenarioOptions, ScenarioOptionsSaved, SaveScenarioOptionColors, OptionCategoriesLoaded, SelectOptions,
	LoadLiteMonotonyRules, LiteMonotonyRulesLoaded
} from './actions';
import { CommonActionTypes, ScenarioLoaded, LoadSalesAgreement, SalesAgreementLoaded, LoadError } from '../actions';
import * as fromRoot from '../reducers';
import * as _ from 'lodash';
import { IOptionCategory, ScenarioOption } from '../../shared/models/lite.model';
import { tryCatch } from '../error.action';
import { SavePendingJio, CreateJobChangeOrders, CreatePlanChangeOrder } from '../change-order/actions';
import { LotsLoaded, LotActionTypes } from '../lot/actions';
import { canDesign } from '../reducers';

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
				const saveScenarioOptions$ = scenarioId
					? this.liteService.saveScenarioOptions(scenarioId, action.scenarioOptions)
					: of(null);
				const isPendingJio = store.salesAgreement.id && store.salesAgreement.status === 'Pending';

				return saveScenarioOptions$.pipe(
					map(scenarioOptions => {
						return { scenarioOptions, isPendingJio };
					})
				);
			}),
			switchMap(result => {
				if (result.isPendingJio)
				{
					return of(new SavePendingJio());
				}
				else if (result.scenarioOptions)
				{
					return of(new ScenarioOptionsSaved(result.scenarioOptions));
				}

				return never();
			})
		);
	});

	saveScenarioOptionColors$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<SaveScenarioOptionColors>(LiteActionTypes.SaveScenarioOptionColors),
			withLatestFrom(this.store),
			switchMap(([action, store]) => {
				const scenarioId = store.scenario.scenario?.scenarioId;
				const saveScenarioOptionColors$ = scenarioId
					? this.liteService.saveScenarioOptionColors(scenarioId, action.optionColors)
					: of(null);
				const isPendingJio = store.salesAgreement.id && store.salesAgreement.status === 'Pending';

				return saveScenarioOptionColors$.pipe(
					map(scenarioOptions => {
						return { scenarioOptions, isPendingJio };
					})
				);
			}),
			switchMap(result => {
				if (result.isPendingJio)
				{
					return of(new SavePendingJio());
				}
				else if (result.scenarioOptions)
				{
					return of(new ScenarioOptionsSaved(result.scenarioOptions));
				}

				return never();
			})
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

				const baseHouseOption = store.lite.options.find(o => o.isBaseHouse && o.isActive);

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

	/**
	 * Runs SavePendingJio when SA, Plans, Lots, Options have all loaded.
	 * This is to make sure we have the most current data when the SA loads.
	 * Same for CreateJobChangeOrders
	**/
	updatePricingOnInitLite$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<SalesAgreementLoaded | PlansLoaded | LotsLoaded | LoadSalesAgreement | LiteOptionsLoaded | OptionCategoriesLoaded>
				(CommonActionTypes.SalesAgreementLoaded, PlanActionTypes.PlansLoaded, LotActionTypes.LotsLoaded, CommonActionTypes.LoadSalesAgreement, LiteActionTypes.LiteOptionsLoaded, LiteActionTypes.OptionCategoriesLoaded),
			scan<Action, any>((curr, action) => {
				if (action instanceof LoadSalesAgreement) {
					return {
						...curr,
						sagLoaded: false,
						plansLoaded: false,
						lotsLoaded: false,
						optionsLoaded: false,
						categoriesLoaded: false,
						salesAgreement: null,
						currentChangeOrder: null
					};
				}

				if (action instanceof SalesAgreementLoaded) {
					return {
						...curr,
						sagLoaded: true,
						salesAgreement: action.salesAgreement,
						currentChangeOrder: action.changeOrder,
						isPhdLite: !action.tree
					};
				}
				else if (action instanceof PlansLoaded) {
					return { ...curr, plansLoaded: true };
				}
				else if (action instanceof LotsLoaded) {
					return { ...curr, lotsLoaded: true };
				}
				else if (action instanceof LiteOptionsLoaded) {
					return { ...curr, optionsLoaded: true };
				}
				else if (action instanceof OptionCategoriesLoaded) {
					return { ...curr, categoriesLoaded: true };
				}
				else {
					return curr; //should never get here
				}
			}, { lotsLoaded: false, plansLoaded: false, sagLoaded: false, optionsLoaded: false, categoriesLoaded: false, salesAgreement: null, currentChangeOrder: null }),
			filter(res => res.lotsLoaded && res.plansLoaded && res.sagLoaded && res.optionsLoaded && res.categoriesLoaded && res.isPhdLite),
			distinct(res => res.salesAgreement.id),
			switchMap(res => {
				return this.store.pipe(
					select(canDesign),
					switchMap(canDesign => {
						//don't do anything if user doesn't have permissions
						if (!canDesign) {
							return empty;
						}

						if (res.salesAgreement.status === 'Pending') {
							return of(new SavePendingJio());
						}
						else if (res.salesAgreement.status === 'Approved' && res.currentChangeOrder && res.currentChangeOrder.salesStatusDescription === 'Pending') {
							const jco = res.currentChangeOrder.jobChangeOrders;

							if (jco.some(co => co.jobChangeOrderTypeDescription === 'Plan')) {
								return of(new CreatePlanChangeOrder());
							}
							else if (jco.some(co => co.jobChangeOrderTypeDescription === 'ChoiceAttribute' || co.jobChangeOrderTypeDescription === 'Elevation')) {
								return of(new CreateJobChangeOrders());
							}
						}
						else {
							return empty;
						}
					})
				);
			})
		);
	});

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private liteService: LiteService
	) { }
}
