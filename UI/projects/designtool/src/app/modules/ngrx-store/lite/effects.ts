import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable, of, combineLatest, from, EMPTY as empty, NEVER } from 'rxjs';
import { switchMap, withLatestFrom, map, scan, filter, distinct, exhaustMap, tap, take, concat, catchError } from 'rxjs/operators';

import { ChangeOrderHanding, ScenarioOption, IdentityService, Permission, ModalService } from 'phd-common';

import { LiteService } from '../../core/services/lite.service';
import { ChangeOrderService } from '../../core/services/change-order.service';
import { PlanService } from '../../core/services/plan.service';

import { DeselectPlan, PlanActionTypes, PlansLoaded, SelectPlan } from '../plan/actions';
import { LotConflict, SaveError, ScenarioActionTypes, ScenarioSaved } from '../scenario/actions';
import
	{
		LiteActionTypes, SetIsPhdLite, LiteOptionsLoaded, SaveScenarioOptions, ScenarioOptionsSaved, SaveScenarioOptionColors, OptionCategoriesLoaded, SelectOptions,
		LoadLiteMonotonyRules, LiteMonotonyRulesLoaded, CancelJobChangeOrderLite, SelectOptionColors, LoadLitePlan, CancelPlanChangeOrderLite, CreateJIOForSpecLite, LoadLiteSpecOrModel,
		ToggleQuickMoveInSelections, ResetLiteState
	} from './actions';
import { CommonActionTypes, ScenarioLoaded, LoadSalesAgreement, SalesAgreementLoaded, LoadError, LoadSpec, JobLoaded } from '../actions';
import * as fromRoot from '../reducers';
import * as _ from 'lodash';
import { IOptionCategory, LitePlanOption } from '../../shared/models/lite.model';
import { tryCatch } from '../error.action';
import { SavePendingJio, CreateJobChangeOrders, CreatePlanChangeOrder, SaveChangeOrderScenario, CurrentChangeOrderLoaded, SetChangingOrder } from '../change-order/actions';
import { LotsLoaded, LotActionTypes } from '../lot/actions';
import { canDesign } from '../reducers';
import { Router } from '@angular/router';
import * as CommonActions from '../actions';
import { CreateEnvelope } from '../contract/actions';
import { JIOForSpecCreated } from '../sales-agreement/actions';
import * as fromLite from '../lite/reducer';
import * as LiteActions from './actions';

@Injectable()
export class LiteEffects
{
	onPlansLoaded$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<PlansLoaded>(PlanActionTypes.PlansLoaded),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const financialCommunityId = store.job?.financialCommunityId || store.scenario?.scenario?.financialCommunityId;

				return this.liteService.isPhdLiteEnabled(financialCommunityId).pipe(
					map(isPhdLiteEnabled =>
					{
						return { action, store, isPhdLiteEnabled };
					})
				);
			}),
			switchMap(result =>
			{
				const action = result.action;
				const store = result.store;
				const isPreview = store.scenario?.buildMode === 'preview';

				if (!isPreview)
				{
					const isPhdLite = result.isPhdLiteEnabled &&
						(
							action.plans?.every(plan => !plan.treeVersionId)
							|| this.liteService.checkLiteAgreement(store.job, store.changeOrder.currentChangeOrder)
							|| this.liteService.checkLiteScenario(store.scenario.scenario?.scenarioChoices, store.scenario.scenario?.scenarioOptions)
						);

					return of(new SetIsPhdLite(isPhdLite));
				}

				return NEVER;
			})
		);
	});

	setIsPhdLite$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SetIsPhdLite>(LiteActionTypes.SetIsPhdLite),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const salesCommunityId = store.opportunity?.opportunityContactAssoc?.opportunity?.salesCommunityId
					?? store.org?.salesCommunity?.id;				
					
				if (action.isPhdLite && !!salesCommunityId)
				{
					return of(new LoadLiteMonotonyRules(salesCommunityId));
				}

				return NEVER;
			})
		);
	});	

	loadOptions$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<ScenarioSaved | ScenarioLoaded | LoadLiteSpecOrModel>(ScenarioActionTypes.ScenarioSaved, CommonActionTypes.ScenarioLoaded, LiteActionTypes.LoadLiteSpecOrModel),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const financialCommunityId = store.job?.financialCommunityId || store.scenario?.scenario?.financialCommunityId;

					return this.liteService.isPhdLiteEnabled(financialCommunityId).pipe(
						map(isPhdLiteEnabled =>
						{
							return { action, store, isPhdLiteEnabled };
						})
					);
				}),
				switchMap(result =>
				{
					const action = result.action;
					const store = result.store;
					const planOptions = store.lite.options;
					const isLiteSpecOrModelLoaded = (action instanceof LoadLiteSpecOrModel);
					const planId = action.scenario?.planId;
					const optionsLoaded = !!planOptions.find(option => option.planId === planId);
					const isSpecScenarioLoaded = (action instanceof ScenarioLoaded) && action.lot?.lotBuildTypeDesc === 'Spec';
					const marketNumber = (action instanceof ScenarioLoaded) ? action.salesCommunity.market.number : '';

					const isPhdLite = result.isPhdLiteEnabled &&
						(isLiteSpecOrModelLoaded
							|| (action instanceof ScenarioLoaded ? !action.scenario.treeVersionId : store.lite.isPhdLite)
							|| this.liteService.checkLiteScenario(action.scenario.scenarioChoices, store.scenario.scenario?.scenarioOptions)
						);

					if (isPhdLite && !optionsLoaded)
					{
						const financialCommunityId = action instanceof ScenarioLoaded
							? action.scenario?.financialCommunityId
							: store.plan.plans?.find(p => p.id === store.plan.selectedPlan)?.communityId;

						const getOptionsCategorySubcategory = !!financialCommunityId
							? this.liteService.getOptionsCategorySubcategory(financialCommunityId)
							: of(null);

						let scenarioOptions: Observable<ScenarioOption[]> = isLiteSpecOrModelLoaded
							? of([])
							: this.liteService.getScenarioOptions(action.scenario.scenarioId);

						return combineLatest([
							this.liteService.getLitePlanOptions(planId),
							scenarioOptions,
							getOptionsCategorySubcategory
						]).pipe(
							switchMap(([options, scenarioOptions, optionsForCategories]) =>
							{
								this.liteService.setOptionsIsPastCutOff(options, store.job);

								let categories: IOptionCategory[] = [];

								if (optionsForCategories)
								{
									let groups = _.groupBy(optionsForCategories, sc => sc.optionCategory.id);
									categories = Object.keys(groups).map(g => ({
										...groups[g][0].optionCategory,
										optionSubCategories: groups[g].map(sc => ({ ...sc, optionCategory: undefined }))
									})).sort((category1, category2) =>
									{
										return category1.name > category2.name ? 1 : -1;
									});
								}

								const optionIds = options.map(o => o.id);
								const optionCommunityIds = _.uniq(options.map(o => o.optionCommunityId));

								return combineLatest([
									this.liteService.getColorItems(optionIds),
									this.liteService.getOptionRelations(optionCommunityIds)
								]).pipe(
									map(([colorItems, optionRelations]) =>
									{
										colorItems.forEach(colorItem =>
										{
											let option = options.find(option => option.id === colorItem.edhPlanOptionId);
											if (option)
											{
												option.colorItems.push(colorItem);
											}
										});

										this.liteService.applyOptionRelations(options, optionRelations);

										return { options, scenarioOptions, categories, isSpecScenarioLoaded, marketNumber, job: store.job };
									})
								);
							})
						);
					}
					else
					{
						return NEVER;
					}
				}),
				switchMap(data =>
				{
					if (data?.isSpecScenarioLoaded)
					{
						return combineLatest([
							this.identityService.getClaims(),
							this.identityService.getAssignedMarkets()
						]).pipe(
							map(([claims, markets]) =>
							{
								let needsOverride = false;
								let canOverride = claims.SalesAgreements && !!(claims.SalesAgreements & Permission.Override) && markets.some(m => m.number === data.marketNumber);
								let jobOptions = [];

								const optionsPastCutoff = data.options?.filter(option => data.scenarioOptions.some(so => so.edhPlanOptionId === option.id) && option.isPastCutOff) || [];

								if (optionsPastCutoff.length > 0)
								{
									// check if option is part of scenario or specJIO
									jobOptions = data.job.jobPlanOptions?.map(jobOption =>
									{
										return { planOptionId: jobOption.planOptionId, overrideNote: null, quantity: jobOption.optionQty };
									});

									optionsPastCutoff.forEach(cutoffOption =>
									{
										const jobOption = jobOptions.find(jo => jo.planOptionId === cutoffOption.id);
										const scenarioOption = data.scenarioOptions.find(so => so.edhPlanOptionId === cutoffOption.id);
										needsOverride = jobOption && jobOption.quantity !== scenarioOption.planOptionQuantity || !jobOption && scenarioOption.planOptionQuantity > 0;
									});
								}

								return { ...data, needsOverride, canOverride, optionsPastCutoff, jobOptions };
							})
						);
					}
					else
					{
						return of({ ...data, needsOverride: false, canOverride: false, optionsPastCutoff: null, jobOptions: null });
					}
				}),
				switchMap(result =>
				{
					let overrideNote: string;
					let overrode = false;

					if (result.needsOverride && result.canOverride)
					{
						return this.modalService.showOverrideModal(`<div>Some of your scenario options are Past Cutoff date/stage and will need to have an Cutoff Override.</div>`).pipe(map((modalResult) =>
						{
							if (modalResult !== 'cancel')
							{
								overrode = true;
								overrideNote = modalResult;

								result.optionsPastCutoff.forEach((option: LitePlanOption) =>
								{
									const scenarioOption = result.scenarioOptions.find(so => so.edhPlanOptionId === option.id);
									const jobOption = result.jobOptions.find(jo => jo.planOptionId === option.id);

									if (scenarioOption && jobOption && scenarioOption.planOptionQuantity !== jobOption.quantity)
									{
										this.store.dispatch(new LiteActions.SetLiteOverrideReason(overrideNote, false));
									}
									else if (!jobOption && scenarioOption?.planOptionQuantity > 0)
									{
										this.store.dispatch(new LiteActions.SetLiteOverrideReason(overrideNote, false));
									}
								});

								return { ...result, overrideNote: overrideNote, overrode: overrode };
							}
							else
							{
								return { ...result, overrideNote: null, overrode: false };
							}
						}));
					}
					else
					{
						return of({ ...result, overrideNote: null, overrode: false });
					}
				}),
				switchMap(result =>
				{
					if (result.needsOverride && !result.overrode)
					{
						return this.modalService.showConfirmModal('Some of your scenario options are Past Cutoff date/stage and will need to have an Cutoff Override.').pipe(map(() =>
						{
							result.optionsPastCutoff.forEach((option: LitePlanOption) =>
							{
								const coJobOption = result.jobOptions.find(jo => jo.edhPlanOptionID === option.id);
								const scenarioOption = result.scenarioOptions.find(so => so.edhPlanOptionId === option.id);

								if (coJobOption)
								{
									if (coJobOption.quantity !== scenarioOption.planOptionQuantity)
									{
										scenarioOption.planOptionQuantity = coJobOption.quantity;
									}
								}
								else
								{
									if (scenarioOption.planOptionQuantity > 0)
									{
										scenarioOption.planOptionQuantity = 0;
									}
								}
							});

							return { ...result };
						}));
					}
					else
					{
						return of({ ...result });
					}
				}),
				switchMap(data =>
				{
					if (data)
					{
						return from([new LiteOptionsLoaded(data.options, data.scenarioOptions), new OptionCategoriesLoaded(data.categories)]);
					}
					return NEVER;
				})
			), LoadError, "Unable to load options")
		);
	});

	loadSalesAgreementOptions$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SalesAgreementLoaded | JobLoaded>(CommonActionTypes.SalesAgreementLoaded, CommonActionTypes.JobLoaded),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					return this.liteService.isPhdLiteEnabled(action.job.financialCommunityId).pipe(
						map(isPhdLiteEnabled =>
						{
							return { action, store, isPhdLiteEnabled };
						})
					);
				}),
				switchMap(result =>
				{
					if (result.isPhdLiteEnabled && (!result.action.tree || this.liteService.checkLiteAgreement(result.action.job, result.action.changeOrder)))
					{
						const action = result.action;
						const store = result.store;

						return combineLatest([
							this.liteService.getLitePlanOptions(store.plan.selectedPlan),
							this.liteService.getOptionsCategorySubcategory(action.job.financialCommunityId)
						]).pipe(
							switchMap(([options, optionsForCategories]) =>
							{
								this.liteService.setOptionsIsPastCutOff(options, action.job);
								let categories: IOptionCategory[] = [];

								if (optionsForCategories)
								{
									let groups = _.groupBy(optionsForCategories, sc => sc.optionCategory.id);
									categories = Object.keys(groups).map(g => ({
										...groups[g][0].optionCategory,
										optionSubCategories: groups[g].map(sc => ({ ...sc, optionCategory: undefined }))
									})).sort((category1, category2) =>
									{
										return category1.name > category2.name ? 1 : -1;
									});
								}

								// Option price
								if (store.salesAgreement.status === 'Approved')
								{
									// Price locked in job
									action.job.jobPlanOptions?.forEach(jobPlanOption =>
									{
										let option = options.find(option => option.id === jobPlanOption.planOptionId);

										if (option && option.listPrice !== jobPlanOption.listPrice)
										{
											option.listPrice = jobPlanOption.listPrice;
										}
									});
								}
								else if (store.salesAgreement.status === 'Signed' || store.salesAgreement.status === 'OutforSignature')
								{
									if (action.changeOrder?.jobChangeOrders)
									{
										// Price locked in JIO when the agreement is out for signature or signed
										const changeOrderPlanOptions = _.flatMap(action.changeOrder.jobChangeOrders, co => co.jobChangeOrderPlanOptions) || [];

										changeOrderPlanOptions.forEach(coPlanOption =>
										{
											let option = options.find(option => option.id === coPlanOption.planOptionId);
											if (option && option.listPrice !== coPlanOption.listPrice)
											{
												option.listPrice = coPlanOption.listPrice;
											}
										});
									}
								}
								else if (store.salesAgreement.status === 'Pending')
								{
									// Update the base house price if phase pricing is set up for the plan
									if (action.lot.salesPhase?.salesPhasePlanPriceAssocs?.length)
									{
										const isPhaseEnabled = action.lot.financialCommunity?.isPhasedPricingEnabled;
										const phasePlanPrice = action.lot.salesPhase?.salesPhasePlanPriceAssocs?.find(x => x.planId === action.job.planId);

										if (isPhaseEnabled && phasePlanPrice)
										{
											let baseHouseOption = options.find(option => option.isBaseHouse && option.isActive);
											baseHouseOption.listPrice = phasePlanPrice.price;
										}
									}
								}

								const optionIds = options.map(o => o.id);
								const optionCommunityIds = _.uniq(options.map(o => o.optionCommunityId));

								return combineLatest([
									this.liteService.getColorItems(optionIds),
									this.liteService.getOptionRelations(optionCommunityIds)
								]).pipe(
									map(([colorItems, optionRelations]) =>
									{
										colorItems.forEach(colorItem =>
										{
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
						return NEVER;
					}
				}),
				switchMap(data =>
				{
					if (data)
					{
						return from([new LiteOptionsLoaded(data.options, data.scenarioOptions), new OptionCategoriesLoaded(data.categories)]);
					}
					return NEVER;
				})
			), LoadError, "Unable to load options")
		);
	});

	saveScenarioOptions$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SaveScenarioOptions>(LiteActionTypes.SaveScenarioOptions),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const scenarioId = store.scenario.scenario?.scenarioId;

				return scenarioId
					? this.liteService.saveScenarioOptions(scenarioId, action.scenarioOptions, action.optionColors)
					: of([]);
			}),
			map(options => new ScenarioOptionsSaved(options))
		);
	});

	saveScenarioOptionColors$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SaveScenarioOptionColors>(LiteActionTypes.SaveScenarioOptionColors),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const scenarioId = store.scenario.scenario?.scenarioId;
				const saveScenarioOptionColors$ = scenarioId
					? this.liteService.saveScenarioOptionColors(scenarioId, action.optionColors)
					: of(null);
				const isPendingJio = store.salesAgreement.id && store.salesAgreement.status === 'Pending';

				return saveScenarioOptionColors$.pipe(
					map(scenarioOptions =>
					{
						return { scenarioOptions, isPendingJio };
					})
				);
			}),
			switchMap(result =>
			{
				if (result.isPendingJio)
				{
					return of(new SavePendingJio());
				}
				else if (result.scenarioOptions)
				{
					return of(new ScenarioOptionsSaved(result.scenarioOptions));
				}

				return NEVER;
			})
		);
	});

	planWasSelectedOrDeselected$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<LiteOptionsLoaded | SelectPlan | DeselectPlan>(LiteActionTypes.LiteOptionsLoaded, PlanActionTypes.SelectPlan, PlanActionTypes.DeselectPlan),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const selectedPlan = action instanceof SelectPlan 
					? store.plan.plans?.find(p => p.id === action.planId)
					: null;

				if (action instanceof SelectPlan && !!action.treeVersionId && !!selectedPlan?.treeVersionId)
				{
					// Clean up lite data when a full plan is selected
					let actions: any[] = [];

					const scenarioId = store.scenario.scenario?.scenarioId;
					const deselectedOptions = store.lite.scenarioOptions.map(option =>
						{
							return {
								scenarioOptionId: option.scenarioOptionId,
								scenarioId: option.scenarioId,
								edhPlanOptionId: option.edhPlanOptionId,
								planOptionQuantity: 0
							} as ScenarioOption;
						});

					if (!!scenarioId && !!deselectedOptions?.length)
					{
						actions.push(new SelectOptions(deselectedOptions));
					}

					actions.push(new ResetLiteState());

					return from(actions);
				}

				if (store.lite.options.length === 0 || store.lite.isPhdLite === false)
				{
					// Select plan in a new configuration
					if (action instanceof SelectPlan)
					{
						const financialCommunityId = store.plan.plans?.find(plan => plan.id === action.planId)?.communityId;

						return this.liteService.isPhdLiteEnabled(financialCommunityId).pipe(
							switchMap(isPhdLiteEnabled => {
								const isPhdLite = isPhdLiteEnabled && !selectedPlan?.treeVersionId;

								let selectPlanActions: any[] = [ new SetIsPhdLite(isPhdLite) ];
								
								if (isPhdLite && (store.scenario.buildMode === 'spec' || store.scenario.buildMode === 'model'))
								{
									let scenario = _.clone(store.scenario.scenario);
									scenario.planId = action.planId;

									selectPlanActions.push(new LoadLiteSpecOrModel(scenario));
								}
								
								return from(selectPlanActions);
							})
						);
					}

					return NEVER;
				}

				const baseHouseOption = store.lite.options.find(o => o.isBaseHouse && o.isActive);
				const selectedOptions = store.lite.options.filter(o => store.lite.scenarioOptions.some(so => so.edhPlanOptionId === o.id));

				const baseHouseOptionSaveIsNeeded = baseHouseOption
					&& store.lite.scenarioOptions.every(so => so.edhPlanOptionId !== baseHouseOption.id)
					&& selectedOptions.every(o => (o.isBaseHouse === false) && (o.name.toLowerCase() !== 'base house'));

				if (action instanceof DeselectPlan)
				{
					const deselectedOptions = store.lite.scenarioOptions.map(option =>
					{
						return {
							scenarioOptionId: option.scenarioOptionId,
							scenarioId: option.scenarioId,
							edhPlanOptionId: option.edhPlanOptionId,
							planOptionQuantity: 0
						} as ScenarioOption;
					});

					return of(new SelectOptions(deselectedOptions));
				}

				if (baseHouseOptionSaveIsNeeded)
				{
					const baseHouseScenarioOptions: ScenarioOption[] = [{
						scenarioOptionId: 0,
						scenarioId: store.scenario.scenario.scenarioId,
						edhPlanOptionId: baseHouseOption.id,
						planOptionQuantity: 1,
						scenarioOptionColors: []
					}];

					return of(new SelectOptions(baseHouseScenarioOptions));
				}

				return NEVER;
			})
		);
	});

	loadLiteMonotonyRules$: Observable<Action> = createEffect(() =>
	{
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
	updatePricingOnInitLite$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SalesAgreementLoaded | PlansLoaded | LotsLoaded | LoadSalesAgreement | LiteOptionsLoaded | OptionCategoriesLoaded>
				(CommonActionTypes.SalesAgreementLoaded, PlanActionTypes.PlansLoaded, LotActionTypes.LotsLoaded, CommonActionTypes.LoadSalesAgreement, LiteActionTypes.LiteOptionsLoaded, LiteActionTypes.OptionCategoriesLoaded),
			scan<Action, any>((curr, action) =>
			{
				if (action instanceof LoadSalesAgreement)
				{
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

				if (action instanceof SalesAgreementLoaded)
				{
					return {
						...curr,
						sagLoaded: true,
						salesAgreement: action.salesAgreement,
						currentChangeOrder: action.changeOrder,
						isPhdLite: !action.tree
					};
				}
				else if (action instanceof PlansLoaded)
				{
					return { ...curr, plansLoaded: true };
				}
				else if (action instanceof LotsLoaded)
				{
					return { ...curr, lotsLoaded: true };
				}
				else if (action instanceof LiteOptionsLoaded)
				{
					return { ...curr, optionsLoaded: true };
				}
				else if (action instanceof OptionCategoriesLoaded)
				{
					return { ...curr, categoriesLoaded: true };
				}
				else
				{
					return curr; //should never get here
				}
			}, { lotsLoaded: false, plansLoaded: false, sagLoaded: false, optionsLoaded: false, categoriesLoaded: false, salesAgreement: null, currentChangeOrder: null }),
			filter(res => res.lotsLoaded && res.plansLoaded && res.sagLoaded && res.optionsLoaded && res.categoriesLoaded && res.isPhdLite),
			distinct(res => res.salesAgreement.id),
			switchMap(res =>
			{
				return this.store.pipe(
					select(canDesign),
					switchMap(canDesign =>
					{
						//don't do anything if user doesn't have permissions
						if (!canDesign)
						{
							return empty;
						}

						if (res.salesAgreement.status === 'Pending')
						{
							return of(new SavePendingJio());
						}
						else if (res.salesAgreement.status === 'Approved' && res.currentChangeOrder && res.currentChangeOrder.salesStatusDescription === 'Pending')
						{
							const jco = res.currentChangeOrder.jobChangeOrders;

							if (jco.some(co => co.jobChangeOrderTypeDescription === 'Plan'))
							{
								return of(new CreatePlanChangeOrder());
							}
							else if (jco.some(co => co.jobChangeOrderTypeDescription === 'ChoiceAttribute' || co.jobChangeOrderTypeDescription === 'Elevation'))
							{
								return of(new CreateJobChangeOrders());
							}
						}
						return empty;
					})
				);
			})
		);
	});

	selectOptions$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SelectOptions | SelectOptionColors>(LiteActionTypes.SelectOptions, LiteActionTypes.SelectOptionColors),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const savingScenario = !store.salesAgreement.id
					&& store.lite.isUnsaved
					&& !store.lite.isSaving
					&& store.scenario.buildMode === 'buyer';

				const savingPendingJio = store.salesAgreement.id && store.salesAgreement.status === 'Pending';

				const savingChangeOrder = !!store.changeOrder &&
					store.changeOrder.currentChangeOrder &&
					(store.changeOrder.currentChangeOrder.id ||
						store.changeOrder.currentChangeOrder.salesStatusDescription === 'Pending');

				if (!savingScenario && !savingPendingJio && savingChangeOrder)
				{
					return of(new SaveChangeOrderScenario());
				}
				else if (savingScenario)
				{
					return action instanceof SelectOptions
						? of(new SaveScenarioOptions(action.scenarioOptions, action.optionColors))
						: of(new SaveScenarioOptionColors(action.optionColors));
				}
				else if (savingPendingJio)
				{
					return of(new SavePendingJio());
				}
				else
				{
					return NEVER;
				}
			})
		);
	});

	cancelJobChangeOrderLite$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CancelJobChangeOrderLite>(LiteActionTypes.CancelJobChangeOrderLite),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);
				const changeOrderId = currentChangeOrder?.id || 0;
				const handing = this.changeOrderService.getSelectedHanding(store.job);
				const selectedOptions = this.liteService.getSelectedOptions(store.lite.options, store.job, currentChangeOrder);
				const deselectedOptions = store.lite.scenarioOptions
					.filter(option => !selectedOptions.some(opt => opt.edhPlanOptionId === option.edhPlanOptionId))
					.map(opt =>
					{
						return { ...opt, planOptionQuantity: 0 };
					});

				let actions: any[] = [];

				if (selectedOptions?.length)
				{
					actions.push(new SelectOptions([...selectedOptions, ...deselectedOptions]));
				}

				if (changeOrderId > 0)
				{
					actions.push(new CurrentChangeOrderLoaded(currentChangeOrder, handing));
				}
				else
				{
					if (store.changeOrder?.currentChangeOrder)
					{
						const jobHanding = new ChangeOrderHanding();
						jobHanding.handing = store.job.handing;
						actions.push(new CurrentChangeOrderLoaded(null, jobHanding));
					}
					actions.push(new SetChangingOrder(false, null, true, handing));
				}

				return from(actions);
			})
		);
	});

	createJIOForSpecLite$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CreateJIOForSpecLite>(LiteActionTypes.CreateJIOForSpecLite),
			withLatestFrom(this.store, this.store.pipe(select(fromLite.selectedElevation))),
			exhaustMap(([action, store, selectedElevation]) =>
				this.liteService.createJioForSpecLite(
					store.scenario.scenario,
					store.lite.scenarioOptions,
					store.lot.selectedLot?.financialCommunity.id,
					store.scenario.buildMode,
					store.lite.options,
					selectedElevation
				)
					.pipe(
						tap(sag => this.router.navigateByUrl('/change-orders')),
						switchMap(job =>
						{
							let jobLoaded$ = this.actions$.pipe(
								ofType<CommonActions.JobLoaded>(CommonActions.CommonActionTypes.JobLoaded),
								take(1),
								map(() => new CreateEnvelope(false))
							);

							return <Observable<Action>>from([
								new LoadSpec(job),
								new JIOForSpecCreated()
							]).pipe(
								concat(jobLoaded$)
							);
						}),
						catchError<Action, Observable<Action>>(error =>
						{
							if (error.error.Message === "Lot Unavailable")
							{
								return of(new LotConflict());
							}

							return of(new SaveError(error))
						})
					)
			)
		);
	});

	loadLitePlan$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<LoadLitePlan>(LiteActionTypes.LoadLitePlan),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					return this.liteService.getLitePlanOptions(action.planId).pipe(
						map(options =>
						{
							this.liteService.setOptionsIsPastCutOff(options, store.job);
							return options;
						})
					);
				}),
				switchMap(options =>
				{
					const optionIds = options.map(o => o.id);
					const optionCommunityIds = _.uniq(options.map(o => o.optionCommunityId));

					return combineLatest([
						this.liteService.getColorItems(optionIds),
						this.liteService.getOptionRelations(optionCommunityIds)
					]).pipe(
						map(([colorItems, optionRelations]) =>
						{
							colorItems.forEach(colorItem =>
							{
								let option = options.find(option => option.id === colorItem.edhPlanOptionId);
								if (option)
								{
									option.colorItems.push(colorItem);
								}
							});

							this.liteService.applyOptionRelations(options, optionRelations);

							return options;
						})
					);
				}),
				switchMap(options => of(new LiteOptionsLoaded(options, [])))
			), LoadError, "Error loading lite plan!")
		);
	});

	cancelPlanChangeOrderLite$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CancelPlanChangeOrderLite>(LiteActionTypes.CancelPlanChangeOrderLite),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);
				const selectedHanding = this.changeOrderService.getSelectedHanding(store.job);
				const selectedPlanId = this.changeOrderService.getSelectedPlan(store.job);

				let actions: any[] = [
					new SetChangingOrder(false, null, true),
					new CurrentChangeOrderLoaded(currentChangeOrder, selectedHanding)
				];

				if (selectedPlanId === store.plan.selectedPlan)
				{
					// Restore option selection from the job and the change order
					if (currentChangeOrder)
					{
						const selectedOptions = this.liteService.getSelectedOptions(store.lite.options, store.job, currentChangeOrder);
						const deselectedOptions = store.lite.scenarioOptions
							.filter(option => !selectedOptions.some(opt => opt.edhPlanOptionId === option.edhPlanOptionId))
							.map(opt =>
							{
								return { ...opt, planOptionQuantity: 0 };
							});

						actions.push(new SelectOptions([...selectedOptions, ...deselectedOptions]));
					}

					return from(actions);
				}

				// Reload options if plan has changed
				return combineLatest([
					this.liteService.getLitePlanOptions(selectedPlanId),
					this.planService.getWebPlanMappingByPlanId(selectedPlanId)
				]).pipe(
					switchMap(([options, mappings]) =>
					{
						this.liteService.setOptionsIsPastCutOff(options, store.job);

						// Option price
						if (store.salesAgreement.status === 'Approved')
						{
							// Price locked in job
							store.job.jobPlanOptions?.forEach(jobPlanOption =>
							{
								let option = options.find(option => option.id === jobPlanOption.planOptionId);
								if (option && option.listPrice !== jobPlanOption.listPrice)
								{
									option.listPrice = jobPlanOption.listPrice;
								}
							});
						}

						const optionIds = options.map(o => o.id);
						const optionCommunityIds = _.uniq(options.map(o => o.optionCommunityId));

						return combineLatest([
							this.liteService.getColorItems(optionIds),
							this.liteService.getOptionRelations(optionCommunityIds)
						]).pipe(
							map(([colorItems, optionRelations]) =>
							{
								colorItems.forEach(colorItem =>
								{
									let option = options.find(option => option.id === colorItem.edhPlanOptionId);
									if (option)
									{
										option.colorItems.push(colorItem);
									}
								});

								this.liteService.applyOptionRelations(options, optionRelations);

								const scenarioOptions = this.liteService.getSelectedOptions(options, store.job, currentChangeOrder);

								return { options, scenarioOptions, mappings };
							})
						)
					}),
					switchMap(data =>
					{
						if (data)
						{
							actions.push(new LiteOptionsLoaded(data.options, data.scenarioOptions));
							actions.push(new SelectPlan(selectedPlanId, 0, data.mappings));
						}
						return from(actions);
					})
				);
			})
		);
	});

	toggleQuickMoveInSelections$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<ToggleQuickMoveInSelections>(LiteActionTypes.ToggleQuickMoveInSelections),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const scenarioId = store.scenario.scenario?.scenarioId;
				const optionsToAdd = _.cloneDeep(action.optionsToAdd);
				const optionDetails = store.lite.options.filter(x => optionsToAdd.some(o => o.edhPlanOptionId === x.id));
				const jobOptionsWithColors = store.job.jobPlanOptions.filter(jpo => jpo.jobPlanOptionAttributes?.length > 0);

				let scenarioOptions: ScenarioOption[] = _.cloneDeep(action.optionsToDelete);
				//setting quantity to zero lets server-side method know that this option needs to be deleted
				scenarioOptions.forEach(o => o.planOptionQuantity = 0);

				jobOptionsWithColors.forEach(jobOption =>
				{
					const optionDetail = optionDetails.find(x => x.id === jobOption.planOptionId);
					if (optionDetail) 
					{
						jobOption.jobPlanOptionAttributes.forEach(attr =>
						{
							const colorItem = optionDetail.colorItems.find(ci => ci.name === attr.attributeGroupLabel);
							if (colorItem) 
							{
								const option = optionsToAdd.find(x => x.edhPlanOptionId === optionDetail.id)
								if (option)
								{
									option.scenarioOptionColors.push({
										scenarioOptionColorId: 0,
										scenarioOptionId: 0,
										colorItemId: colorItem.colorItemId,
										colorId: colorItem.color.find(c => c.name === attr.attributeName)?.colorId
									});
								}
							}
						});
					}
				});

				scenarioOptions = scenarioOptions.concat(optionsToAdd);

				return scenarioId
					? this.liteService.saveScenarioOptions(scenarioId, scenarioOptions, [], action.deletePhdFullData)
					: of([]);
			}),
			map(options => new ScenarioOptionsSaved(options))
		);
	});

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private liteService: LiteService,
		private changeOrderService: ChangeOrderService,
		private planService: PlanService,
		private identityService: IdentityService,
		private router: Router,
		private modalService: ModalService
	) { }
}
