import { Observable, forkJoin, from, of, NEVER } from 'rxjs';
import { switchMap, withLatestFrom, map, combineLatest } from 'rxjs/operators';

import { SalesAgreementService } from './../../core/services/sales-agreement.service';
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';

import
{
	ESignEnvelope, ESignStatusEnum, ESignTypeEnum, ChangeInput, ChangeTypeEnum, ChangeOrderGroup, ChangeOrderHanding,
	Job, SalesStatusEnum, ModalService, mergeSalesChangeOrderBuyers, TreeService, Constants
} from 'phd-common';

import { ChangeOrderService } from '../../core/services/change-order.service';
import
{
	ChangeOrderActionTypes, LoadError, CurrentChangeOrderLoaded, SetChangingOrder, ChangeInputInitialized,
	CreateJobChangeOrders, ChangeOrdersCreated, SaveError, CancelJobChangeOrder, CreateSalesChangeOrder, CreateNonStandardChangeOrder, CreatePlanChangeOrder, CancelPlanChangeOrder,
	CancelLotTransferChangeOrder, CancelSalesChangeOrder, SetCurrentChangeOrder, CancelNonStandardChangeOrder, SavePendingJio, CreateCancellationChangeOrder, CreateLotTransferChangeOrder,
	ResubmitChangeOrder, ChangeOrderOutForSignature, SetSalesChangeOrderTermsAndConditions, CurrentChangeOrderPending, CurrentChangeOrderOutForSignature
} from './actions';
import { TreeLoadedFromJob, SelectChoices, SetLockedInChoices } from '../scenario/actions';
import { ChangeOrdersCreatedForJob, JobUpdated } from '../job/actions';
import { SelectLot } from '../lot/actions';
import { OpportunityLoaded } from '../opportunity/actions';
import { SetChangeOrderTemplates } from '../contract/actions';
import { SelectPlan, PlansLoaded } from '../plan/actions';
import { SalesAgreementSaved } from '../sales-agreement/actions';

import { CommonActionTypes, SalesAgreementLoaded, JobLoaded, ESignEnvelopesLoaded } from '../actions';

import * as CommonActions from '../actions';
import * as ChangeOrderActions from '../change-order/actions';

import * as fromRoot from '../reducers';

import * as _ from 'lodash';
import { OptionService } from '../../core/services/option.service';
import { PlanService } from '../../core/services/plan.service';
import { ContractService } from '../../core/services/contract.service';

import { setTreePointsPastCutOff } from '../../shared/classes/tree.utils';
import { tryCatch } from '../error.action';
import { priceBreakdown } from '../reducers';

// PHD Lite
import { LiteService } from '../../core/services/lite.service';

@Injectable()
export class ChangeOrderEffects
{
	initializeChangeInput$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SetChangingOrder | ResubmitChangeOrder>(ChangeOrderActionTypes.SetChangingOrder, ChangeOrderActionTypes.ResubmitChangeOrder),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					let newInput = { ...store.changeOrder.changeInput } as ChangeInput;

					const updateInput = action instanceof ResubmitChangeOrder || action.isChangingOrder;

					if (updateInput && action.changeInput)
					{
						let changeOrderExists: boolean = !!(store.changeOrder.currentChangeOrder && store.changeOrder.currentChangeOrder.id);

						if (!changeOrderExists)
						{
							newInput = { ...action.changeInput } as ChangeInput;
							newInput.trustName = store.salesAgreement.trustName;
							newInput.isTrustNa = store.salesAgreement.isTrustNa;
							newInput.buyers = _.cloneDeep(store.salesAgreement.buyers);

							if (action.changeInput.type === ChangeTypeEnum.CONSTRUCTION)
							{
								const handing = new ChangeOrderHanding();
								handing.handing = store.job.handing;
								newInput.handing = handing;
							}
						}
					}
					return from([
						new ChangeInputInitialized(newInput),
						new SetChangeOrderTemplates(store.changeOrder.isChangingOrder)
					]);
				})
			), LoadError, "Error initializing change input!!")
		);
	});

	createJobChangeOrders$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CreateJobChangeOrders>(ChangeOrderActionTypes.CreateJobChangeOrders),
			withLatestFrom(
				this.store,
				this.store.pipe(select(priceBreakdown)),
				this.store.pipe(select(fromRoot.legacyColorScheme))
			),
			tryCatch(source => source.pipe(
				switchMap(([action, store, priceBreakdown, legacyColorScheme]) =>
				{
					const isPhdLite = store.lite.isPhdLite || !store.scenario.tree;

					let changePrice = !!store.salesAgreement
						? priceBreakdown.totalPrice - store.salesAgreement.salePrice
						: 0;

					const baseHouseOption = store.job.jobPlanOptions ? store.job.jobPlanOptions.find(x => x.jobOptionTypeName === 'BaseHouse') : null;
					let inputData = isPhdLite
						? this.liteService.getJobChangeOrderInputDataLite(
							store.changeOrder.currentChangeOrder,
							store.job,
							store.changeOrder.changeInput.handing,
							store.salesAgreement.id,
							store.lite.scenarioOptions,
							store.lite.options,
							store.lite.elevationOverrideNote || store.lite.colorSchemeOverrideNote,
							legacyColorScheme,
							false
						)
						: this.changeOrderService.getJobChangeOrderInputData(
							store.scenario.tree,
							store.changeOrder.currentChangeOrder,
							store.job,
							store.changeOrder.changeInput.handing,
							store.salesAgreement.id,
							baseHouseOption,
							store.scenario.rules.optionRules);

					const pendingJobSummary = isPhdLite
						? this.liteService.mapPendingJobSummaryLite(store.job.id, priceBreakdown, store.lite.scenarioOptions, store.lite.options)
						: this.changeOrderService.mapPendingJobSummary(store.job.id, priceBreakdown, store.scenario.tree, store.scenario.options);
					inputData = { ...inputData, pendingJobSummary: pendingJobSummary };

					const data = this.changeOrderService.mergePosData(
						inputData,
						store.changeOrder.currentChangeOrder,
						store.salesAgreement,
						store.changeOrder.changeInput,
						store.job.id);

					const createJobChangeOrder$ = isPhdLite
						? this.liteService.createJobChangeOrderLite(data, changePrice)
						: this.changeOrderService.createJobChangeOrder(data, changePrice);

					return createJobChangeOrder$.pipe(
						switchMap(changeOrder =>
						{
							if (isPhdLite)
							{
								return of(changeOrder);
							}
							else
							{
								let jobChangeOrderChoices = this.changeOrderService.getJobChangeOrderChoices([changeOrder]);
								return this.treeService.getChoiceCatalogIds(jobChangeOrderChoices, true).pipe(
									map(choices => { return changeOrder })
								);
							}

						}),
						switchMap(changeOrder => from([
							new ChangeOrdersCreatedForJob([changeOrder]),
							new ChangeOrdersCreated([changeOrder]),
							new SetChangingOrder(!!changeOrder, null, true)
						])
						)
					);
				})
			), SaveError, "Error creating construction change order!!"),
			switchMap((action: any) =>
			{
				if (action instanceof SaveError)
				{
					return this.modalService.showErrorModal(`<div>Error in creating Construction Change Order. Please contact TSC to proceed</div>`).pipe(
						switchMap(() => from([action, new SetChangingOrder(false, null, true)]))
					);
				}
				else
				{
					return of(action);
				}
			})
		);
	});

	createSalesChangeOrder$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<CreateSalesChangeOrder>(ChangeOrderActionTypes.CreateSalesChangeOrder),
			withLatestFrom(this.store, this.store.pipe(select(priceBreakdown))),
			tryCatch(source => source.pipe(
				switchMap(([action, store, priceBreakdown]) =>
				{
					const changePrice = priceBreakdown.totalPrice - store.salesAgreement.salePrice;

					let data = this.changeOrderService.getSalesChangeOrderData(
						store.changeOrder.currentChangeOrder,
						store.salesAgreement,
						store.changeOrder.changeInput,
						store.job.id,
						action.specSales);

					const isPhdLite = store.lite.isPhdLite || !store.scenario.tree;
					const pendingJobSummary = isPhdLite
						? this.liteService.mapPendingJobSummaryLite(store.job.id, priceBreakdown, store.lite.scenarioOptions, store.lite.options)
						: this.changeOrderService.mapPendingJobSummary(store.job.id, priceBreakdown, store.scenario.tree, store.scenario.options);

					data = { ...data, pendingJobSummary: pendingJobSummary };

					return forkJoin(
						this.changeOrderService.createJobChangeOrder(data, changePrice),
						of(store.changeOrder.changeInput),
						of(store.salesAgreement)
					);
				}),
				switchMap(([changeOrder, changeInput, salesAgreement]) =>
				{
					let newInput = _.cloneDeep(changeInput);
					const trust = this.changeOrderService.mergeSalesChangeOrderTrusts(salesAgreement, changeOrder);

					if (trust)
					{
						newInput.trustName = trust.trustName;
						newInput.isTrustNa = trust.isTrustNa;
					}

					return from([
						new ChangeOrdersCreatedForJob([changeOrder]),
						new ChangeOrdersCreated([changeOrder]),
						new ChangeInputInitialized(newInput),
						new SetChangingOrder(!!changeOrder, null, true)
					]);
				})
			), SaveError, "Error creating sales change order!!"),
			switchMap((action: any) =>
			{
				if (action instanceof SaveError)
				{
					return this.modalService.showErrorModal(`<div>Error in creating Sales Change Order. Please contact TSC to proceed</div>`).pipe(
						switchMap(() => from([action, new SetChangingOrder(false, null, true)]))
					);
				}
				else
				{
					return of(action);
				}
			})
		)
	);

	cancelJobChangeOrder$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<CancelJobChangeOrder>(ChangeOrderActionTypes.CancelJobChangeOrder),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);

					return forkJoin(
						of(action),
						this.changeOrderService.getLockedInChoices(store.job, store.scenario.tree, currentChangeOrder),
						of({ store: store, currentChangeOrder: currentChangeOrder })
					);
				}),
				switchMap(([action, lockInChoices, data]) =>
				{
					const changeOrderId = data.currentChangeOrder?.id || 0;
					const choices = this.changeOrderService.getOriginalChoicesAndAttributes(data.store.job, data.store.scenario.tree, data.currentChangeOrder).map(ch =>
					{
						ch.cancellingChangeOrder = true;
						return ch;
					});
					const handing = this.changeOrderService.getSelectedHanding(data.store.job);

					let actions: any[] = [
						new SetCurrentChangeOrder(changeOrderId)
					];

					if (lockInChoices && lockInChoices.length)
					{
						actions.push(new SetLockedInChoices(lockInChoices));
					}

					if (choices && choices.length && action.isChangeDirty)
					{
						actions.push(new SelectChoices(false, ...choices));
					}

					if (changeOrderId > 0)
					{
						actions.push(new CurrentChangeOrderLoaded(data.currentChangeOrder, handing));
					}
					else
					{
						actions.push(new SetChangingOrder(false, null, true, handing));
					}

					return from(actions);
				})
			), SaveError, "Error cancelling change order!!")
		)
	);

	createNonStandardChangeOrder: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CreateNonStandardChangeOrder>(ChangeOrderActionTypes.CreateNonStandardChangeOrder),
			withLatestFrom(this.store, this.store.pipe(select(priceBreakdown))),
			tryCatch(source => source.pipe(
				switchMap(([action, store, priceBreakdown]) =>
				{
					let changePrice = !!store.salesAgreement
						? priceBreakdown.totalPrice - store.salesAgreement.salePrice
						: 0;

					let inputData = this.changeOrderService.getNonStandardChangeOrderData(
						store.job.id,
						store.salesAgreement.id,
						store.changeOrder.currentChangeOrder,
						action.options);

					const isPhdLite = store.lite.isPhdLite || !store.scenario.tree;
					const pendingJobSummary = isPhdLite
						? this.liteService.mapPendingJobSummaryLite(store.job.id, priceBreakdown, store.lite.scenarioOptions, store.lite.options)
						: this.changeOrderService.mapPendingJobSummary(store.job.id, priceBreakdown, store.scenario.tree, store.scenario.options);
					inputData = { ...inputData, pendingJobSummary: pendingJobSummary };

					const data = this.changeOrderService.mergePosData(
						inputData,
						store.changeOrder.currentChangeOrder,
						store.salesAgreement,
						store.changeOrder.changeInput,
						store.job.id);

					return this.changeOrderService.createJobChangeOrder(data, changePrice);
				}),
				switchMap(changeOrder =>
					from([
						new ChangeOrdersCreatedForJob([changeOrder]),
						new ChangeOrdersCreated([changeOrder]),
						new SetChangingOrder(!!changeOrder, null, true)
					])
				)
			), SaveError, "Error creating non-standard change order!!"),
			switchMap((action: any) =>
			{
				if (action instanceof SaveError)
				{
					return this.modalService.showErrorModal(`<div>Error in creating NSO Change Order. Please contact TSC to proceed</div>`).pipe(
						switchMap(() => from([action, new SetChangingOrder(false, null, true)]))
					);
				}
				else
				{
					return of(action);
				}
			})
		);
	});

	cancelNonStandardChangeOrder$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CancelNonStandardChangeOrder>(ChangeOrderActionTypes.CancelNonStandardChangeOrder),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);
					const changeOrderId = currentChangeOrder ? currentChangeOrder.id : 0;

					let actions = [];
					actions.push(new SetChangingOrder(false, null, true));

					if (changeOrderId > 0)
					{
						const handing = new ChangeOrderHanding();
						handing.handing = store.job.handing;
						actions.push(new CurrentChangeOrderLoaded(currentChangeOrder, handing));
					} else
					{
						actions.push(new SetCurrentChangeOrder(changeOrderId));
					}

					return from(actions);
				})
			), SaveError, "Error cancelling non-standard change order!!")
		);
	});

	createPlanChangeOrder: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CreatePlanChangeOrder>(ChangeOrderActionTypes.CreatePlanChangeOrder),
			withLatestFrom(this.store, this.store.pipe(select(priceBreakdown))),
			tryCatch(source => source.pipe(
				switchMap(([action, store, priceBreakdown]) =>
				{
					const isPhdLite = store.lite.isPhdLite;

					let changePrice = !!store.salesAgreement
						? priceBreakdown.totalPrice - store.salesAgreement.salePrice
						: 0;

					let inputData = isPhdLite
						? this.liteService.getPlanChangeOrderDataLite(
							store.changeOrder.currentChangeOrder,
							store.job,
							store.plan.selectedPlan,
							store.salesAgreement.id,
							store.lite.scenarioOptions,
							store.lite.options,
							store.lite.elevationOverrideNote || store.lite.colorSchemeOverrideNote)
						: this.changeOrderService.getPlanChangeOrderData(
							store.scenario.tree,
							store.changeOrder.currentChangeOrder,
							store.job,
							store.plan.selectedPlan,
							store.salesAgreement.id,
							priceBreakdown.baseHouse,
							store.scenario.rules.optionRules);

					const nonStandardOptions = store.job.jobNonStandardOptions.map(jnso =>
					{
						return {
							id: jnso.id,
							nonStandardOptionName: jnso.name,
							nonStandardOptionDescription: jnso.description,
							financialOptionNumber: jnso.financialOptionNumber,
							action: 'Delete',
							qty: jnso.quantity,
							unitPrice: jnso.unitPrice
						};
					});
					inputData.nonStandardOptions = nonStandardOptions;

					const pendingJobSummary = isPhdLite
						? this.liteService.mapPendingJobSummaryLite(store.job.id, priceBreakdown, store.lite.scenarioOptions, store.lite.options)
						: this.changeOrderService.mapPendingJobSummary(store.job.id, priceBreakdown, store.scenario.tree, store.scenario.options);
					inputData = { ...inputData, pendingJobSummary: pendingJobSummary };

					const data = this.changeOrderService.mergePosData(
						inputData,
						store.changeOrder.currentChangeOrder,
						store.salesAgreement,
						store.changeOrder.changeInput,
						store.job.id);

					const createPlanChangeOrder$ = isPhdLite
						? this.liteService.createJobChangeOrderLite(data, changePrice)
						: this.changeOrderService.createJobChangeOrder(data, changePrice);

					return createPlanChangeOrder$.pipe(
						switchMap(changeOrder =>
						{
							if (isPhdLite)
							{
								return of(changeOrder);
							}
							else
							{
								let jobChangeOrderChoices = this.changeOrderService.getJobChangeOrderChoices([changeOrder]);
								return this.treeService.getChoiceCatalogIds(jobChangeOrderChoices, true).pipe(
									map(choices => { return changeOrder })
								);
							}
						})
					);
				}),
				switchMap(changeOrder =>
					from([
						new ChangeOrdersCreatedForJob([changeOrder]),
						new ChangeOrdersCreated([changeOrder]),
						new SetChangingOrder(!!changeOrder, null, true)
					])
				)
			), SaveError, "Error creating plan change order!!"),
			switchMap((action: any) =>
			{
				if (action instanceof SaveError)
				{
					return this.modalService.showErrorModal(`<div>Error in creating Plan Change Order. Please contact TSC to proceed</div>`).pipe(
						switchMap(() => from([action, new SetChangingOrder(false, null, true)]))
					);
				}
				else
				{
					return of(action);
				}
			})
		);
	});

	cancelPlanChangeOrder$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CancelPlanChangeOrder>(ChangeOrderActionTypes.CancelPlanChangeOrder),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);
					const changeOrderId = currentChangeOrder ? currentChangeOrder.id : 0;

					return from([
						new SetChangingOrder(false, null, true),
						new SetCurrentChangeOrder(changeOrderId)
					]);
				})
			), SaveError, "Error cancelling plan change order!!")
		);
	});

	createLotTransferChangeOrder: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CreateLotTransferChangeOrder>(ChangeOrderActionTypes.CreateLotTransferChangeOrder),
			withLatestFrom(this.store, this.store.pipe(select(priceBreakdown))),
			tryCatch(source => source.pipe(
				switchMap(([action, store, priceBreakdown]) =>
				{
					let changePrice = !!store.salesAgreement
						? priceBreakdown.totalPrice - store.salesAgreement.salePrice
						: 0;

					const handing = store.job.handing !== store.changeOrder.changeInput.handing.handing
						? store.changeOrder.changeInput.handing
						: null;
					const inputData = this.changeOrderService.getLotTransferChangeOrderData(
						store.job.id,
						store.salesAgreement.id,
						store.changeOrder.currentChangeOrder,
						handing.handing);
					const data = this.changeOrderService.mergePosData(
						inputData,
						store.changeOrder.currentChangeOrder,
						store.salesAgreement,
						store.changeOrder.changeInput,
						store.job.id);
					return this.changeOrderService.createJobChangeOrder(data, changePrice);
				}),
				switchMap(changeOrder =>
					from([
						new ChangeOrdersCreatedForJob([changeOrder]),
						new ChangeOrdersCreated([changeOrder]),
						new SetChangingOrder(!!changeOrder, null, true)
					])
				)
			), SaveError, "Error creating lot transfer change order!!"),
			switchMap((action: any) =>
			{
				if (action instanceof SaveError)
				{
					return this.modalService.showErrorModal(`<div>Error in creating Lot Transfer Change Order. Please contact TSC to proceed</div>`).pipe(
						switchMap(() => from([action, new SetChangingOrder(false, null, true)]))
					);
				}
				else
				{
					return of(action);
				}
			})
		);
	});

	cancelLotTransferChangeOrder$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CancelLotTransferChangeOrder>(ChangeOrderActionTypes.CancelLotTransferChangeOrder),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const originalLotId = this.changeOrderService.getOriginalLotId(store.job);
					const handing = this.changeOrderService.getSelectedHanding(store.job);
					const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);

					return from([
						new SelectLot(originalLotId),
						new SetChangingOrder(false, null, true, handing),
						new CurrentChangeOrderLoaded(currentChangeOrder, handing)
					]);
				})
			), SaveError, "Error cancelling lot transfer change order!!")
		);
	});

	cancelSalesChangeOrder$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CancelSalesChangeOrder>(ChangeOrderActionTypes.CancelSalesChangeOrder),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);
					const changeOrderId = currentChangeOrder ? currentChangeOrder.id : 0;

					let actions = [];
					actions.push(new SetChangingOrder(false, null, true));

					if (changeOrderId > 0)
					{
						const handing = new ChangeOrderHanding();
						handing.handing = store.job.handing;
						actions.push(new CurrentChangeOrderLoaded(currentChangeOrder, handing));
					} else
					{
						actions.push(new SetCurrentChangeOrder(changeOrderId));
					}

					return from(actions);
				})
			), SaveError, "Error cancelling sales change order!!")
		);
	});

	currentChangeOrderLoaded$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CurrentChangeOrderLoaded | SalesAgreementLoaded | JobLoaded>(ChangeOrderActionTypes.CurrentChangeOrderLoaded, CommonActionTypes.SalesAgreementLoaded, CommonActionTypes.JobLoaded),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					if (store.changeOrder && store.changeOrder.changeInput)
					{
						let newInput = { ...store.changeOrder.changeInput } as ChangeInput;

						newInput.buyers = mergeSalesChangeOrderBuyers(store.salesAgreement.buyers, action.changeOrder);

						const trust = this.changeOrderService.mergeSalesChangeOrderTrusts(store.salesAgreement, store.changeOrder.currentChangeOrder);

						if (trust)
						{
							newInput.trustName = trust.trustName;
							newInput.isTrustNa = trust.isTrustNa;
						}

						newInput.changeOrderPlanId = store.plan.selectedPlan;

						if (store.job.lot && store.job.lot.lotBuildTypeDesc === 'Spec'
							&& [Constants.AGREEMENT_STATUS_PENDING, Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE, Constants.AGREEMENT_STATUS_SIGNED].indexOf(store.salesAgreement.status) !== -1
							&& (!store.opportunity.opportunityContactAssoc || !store.opportunity.opportunityContactAssoc.opportunity)
							&& newInput.buyers && newInput.buyers.length)
						{
							return from([
								new OpportunityLoaded(newInput.buyers[0].opportunityContactAssoc),
								new ChangeInputInitialized(newInput)
							]);
						}
						else
						{
							return of(new ChangeInputInitialized(newInput));
						}
					}

					return of(new ChangeInputInitialized(null));
				})
			), LoadError, "Error loading current change order!!")
		);
	});

	setCurrentChangeOrder$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SetCurrentChangeOrder>(ChangeOrderActionTypes.SetCurrentChangeOrder),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					if (!store.changeOrder.currentChangeOrder && action.changeOrderId === 0
						|| store.changeOrder.currentChangeOrder && store.changeOrder.currentChangeOrder.id === action.changeOrderId)
					{
						return new Observable<never>();
					}

					if (action.changeOrderId === 0 && store.changeOrder.currentChangeOrder && store.changeOrder.currentChangeOrder.id)
					{
						const handing = new ChangeOrderHanding();
						handing.handing = store.job.handing;
						return of(new CurrentChangeOrderLoaded(null, handing));
					}

					const currentChangeOrder = store.job && store.job.changeOrderGroups
						? _.cloneDeep(store.job.changeOrderGroups.find(co => co.id === action.changeOrderId))
						: null;

					const selectedChoices = this.changeOrderService.getSelectedChoices(store.job, currentChangeOrder);
					const selectedHanding = this.changeOrderService.getSelectedHanding(store.job);
					const selectedPlanId = this.changeOrderService.getSelectedPlan(store.job);

					if (selectedPlanId === store.plan.selectedPlan)
					{
						let actions: any[] = [
							new CurrentChangeOrderLoaded(currentChangeOrder, selectedHanding)
						];

						if (currentChangeOrder)
						{
							const choices = this.changeOrderService.getOriginalChoicesAndAttributes(store.job, store.scenario.tree, currentChangeOrder);

							actions.push(new SelectChoices(false, ...choices));
						}

						return from(actions);
					}

					const selectedPlan = store.plan.plans.find(x => x.id === selectedPlanId);

					if (selectedPlan && store.scenario.tree && selectedPlan.treeVersionId === store.scenario.tree.treeVersion.id)
					{
						return from([
							new CurrentChangeOrderLoaded(currentChangeOrder, selectedHanding),
							new SelectPlan(selectedPlanId, selectedPlan.treeVersionId, selectedPlan.marketingPlanId)
						]);
					}

					// Reload the tree if plan has changed
					const jobChangeOrderChoices = this.changeOrderService.getJobChangeOrderChoices([currentChangeOrder]);
					const jobChangeOrderPlanOptions = this.changeOrderService.getJobChangeOrderPlanOptions(currentChangeOrder);

					return this.changeOrderService.getTreeVersionIdByJobPlan(selectedPlanId).pipe(
						switchMap(treeVersionId => this.treeService.getTree(treeVersionId).pipe(
							combineLatest(
								this.treeService.getRules(treeVersionId, true),
								this.optionService.getPlanOptions(selectedPlanId, null, true),
								this.treeService.getOptionImages(treeVersionId, [], null, true),
								this.planService.getWebPlanMappingByPlanId(selectedPlanId)
							),
							map(([tree, rules, options, images, mappings]) =>
							{
								return { tree, rules, options, images, job: store.job, mappings };
							}),
							//include anything that has been previously sold or locked down in the tree
							this.treeService.mergeIntoTree(
								[...store.job.jobChoices, ...(currentChangeOrder && currentChangeOrder.salesStatusDescription === 'Pending' ? [] : jobChangeOrderChoices)],
								[...store.job.jobPlanOptions, ...(currentChangeOrder && currentChangeOrder.salesStatusDescription === 'Pending' ? [] : jobChangeOrderPlanOptions)],
								currentChangeOrder),
							map(data =>
							{
								setTreePointsPastCutOff(data.tree, store.job);

								return data;
							})
						)),
						switchMap(data => from([
							new CurrentChangeOrderLoaded(currentChangeOrder, selectedHanding),
							new TreeLoadedFromJob(selectedChoices, data.tree, data.rules, data.options, data.images, data.job.lot, data.job, store.org.salesCommunity),
							new SelectPlan(selectedPlanId, data.tree.treeVersion.id, data.mappings)
						]))
					);
				})
			), LoadError, 'Error setting current change order!!')
		);
	});

	savePendingJio$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SavePendingJio>(ChangeOrderActionTypes.SavePendingJio),
			withLatestFrom(
				this.store,
				this.store.pipe(select(priceBreakdown)),
				this.store.pipe(select(fromRoot.legacyColorScheme))
			),
			tryCatch(source => source.pipe(
				switchMap(([action, store, priceBreakdown, legacyColorScheme]) =>
				{
					const isSpecSalePending = store.job.lot && store.job.lot.lotBuildTypeDesc === 'Spec' && store.salesAgreement.status === Constants.AGREEMENT_STATUS_PENDING;
					const typeDescription = isSpecSalePending ? 'BuyerChangeOrder' : 'SalesJIO';
					const jio = store.job.changeOrderGroups
						? store.job.changeOrderGroups.find(x => x.jobChangeOrders && x.jobChangeOrders.some(co => co.jobChangeOrderTypeDescription === typeDescription))
						: null;
					const isPhdLite = store.lite.isPhdLite || !store.scenario.tree;

					if (jio)
					{
						const jobHanding = new ChangeOrderHanding();

						jobHanding.handing = store.job.handing;

						const currentHanding = action.handing || (isSpecSalePending ? this.changeOrderService.getSelectedHanding(store.job) : jobHanding);

						const baseHouseOption = store.scenario.options ? store.scenario.options.find(o => o.isBaseHouse) : null;
						let inputData = isPhdLite
							? this.liteService.getJobChangeOrderInputDataLite(
								jio as ChangeOrderGroup,
								store.job,
								currentHanding,
								store.salesAgreement.id,
								store.lite.scenarioOptions,
								store.lite.options,
								store.lite.elevationOverrideNote || store.lite.colorSchemeOverrideNote,
								legacyColorScheme,
								!isSpecSalePending
							)
							: this.changeOrderService.getJobChangeOrderInputData(
								store.scenario.tree,
								jio as ChangeOrderGroup,
								store.job,
								currentHanding,
								store.salesAgreement.id,
								baseHouseOption,
								store.scenario.rules.optionRules,
								!isSpecSalePending,
								priceBreakdown.baseHouse);

						const pendingJobSummary = isPhdLite
							? this.liteService.mapPendingJobSummaryLite(store.job.id, priceBreakdown, store.lite.scenarioOptions, store.lite.options)
							: this.changeOrderService.mapPendingJobSummary(store.job.id, priceBreakdown, store.scenario.tree, store.scenario.options);
						inputData = { ...inputData, pendingJobSummary: pendingJobSummary };

						if (isSpecSalePending)
						{
							var data = this.changeOrderService.mergePosData(
								inputData,
								store.changeOrder.currentChangeOrder,
								store.salesAgreement,
								store.changeOrder.changeInput,
								store.job.id,
								isSpecSalePending);

							data.saveBuyerContact = true;
						}

						const createJobChangeOrder$ = isPhdLite
							? this.liteService.createJobChangeOrderLite(isSpecSalePending ? data : inputData, priceBreakdown.totalPrice)
							: this.changeOrderService.createJobChangeOrder(isSpecSalePending ? data : inputData, priceBreakdown.totalPrice);

						return createJobChangeOrder$.pipe(
							switchMap(changeOrder =>
							{
								const actions: any[] = [
									new ChangeOrdersCreatedForJob([changeOrder]),
									new ChangeOrdersCreated([changeOrder])
								];

								const buyerChangeOrder = changeOrder ? changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'BuyerChangeOrder') : null;

								if (isSpecSalePending && buyerChangeOrder)
								{
									const newInput = _.cloneDeep(store.changeOrder.changeInput);

									newInput.buyers = mergeSalesChangeOrderBuyers(store.salesAgreement.buyers, changeOrder);

									actions.push(new ChangeInputInitialized(newInput));
								}

								return from(actions);
							})
						);
					}
					else
					{
						return new Observable<never>();
					}
				})
			), SaveError, 'Error saving pending JIO!!')
		);
	});

	createCancellationChangeOrder$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CreateCancellationChangeOrder>(ChangeOrderActionTypes.CreateCancellationChangeOrder),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const latestChangeOrderGroup = _.maxBy(store.job.changeOrderGroups, 'changeOrderGroupSequence');
					const groupSequence = latestChangeOrderGroup ? (latestChangeOrderGroup.changeOrderGroupSequence + 1) : 0;

					return this.changeOrderService.createCancellationChangeOrder(store.job.id, store.salesAgreement.id, groupSequence);
				}),
				switchMap((cog: ChangeOrderGroup) => from([new ChangeOrdersCreatedForJob([cog])]))
			), SaveError, 'Error creating Cancellation Change Order!!')
		);
	});

	/*
	 * Change Order Out For Signature
	 */
	changeOrderOutForSignature$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<ChangeOrderOutForSignature>(ChangeOrderActionTypes.ChangeOrderOutForSignature),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					let changeOrder = { ...action.changeOrder, salesStatusDescription: 'OutforSignature', jobChangeOrderGroupSalesStatusHistories: undefined };
					let eSignEnvelope: Observable<ESignEnvelope>;

					// create eSignEnvelope record to track docusign status
					if (!action.isWetSign)
					{
						const newEnvelope: ESignEnvelope = {
							edhChangeOrderGroupId: changeOrder.id,
							envelopeGuid: changeOrder.envelopeId,
							eSignStatusId: action.envelopeSent ? ESignStatusEnum.Sent : ESignStatusEnum.Created,
							eSignTypeId: ESignTypeEnum.ChangeOrder
						};

						eSignEnvelope = this.changeOrderService.createESignEnvelope(newEnvelope);
					}

					// Update Change Order, create a eSignEnvelope if needed, and get mergeFields
					return forkJoin(
						this.changeOrderService.updateJobChangeOrder([changeOrder]),
						!eSignEnvelope ? of<ESignEnvelope>(null) : eSignEnvelope,
						of(action)
					);
				}),
				switchMap(([changeOrders, eSignEnvelope, action]) =>
				{
					if (eSignEnvelope != null)
					{
						changeOrders[0].eSignEnvelopes = [eSignEnvelope];
					}

					let actions = [];

					actions.push(new CommonActions.ChangeOrdersUpdated(changeOrders));

					if (action.setChangeOrder)
					{
						actions.push(new ChangeOrderActions.SetChangingOrder(false, null, false));
					}

					return from(actions);
				})
			), SaveError, 'Error setting change order out for signature!!')
		);
	});

	setSalesChangeOrderTermsAndConditions$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SetSalesChangeOrderTermsAndConditions>(ChangeOrderActionTypes.SetSalesChangeOrderTermsAndConditions),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					let note = _.cloneDeep(action.termsAndConditionsNote);
					if (action.agreementNote)
					{
						note.id = 0;
					}
					return forkJoin(this.salesAgreementService.saveNote(note), of(store))
				}),
				switchMap(([result, store]) =>
				{
					let actions = [];
					actions.push(new ChangeOrderActions.SalesChangeOrderTermsAndConditionsSaved(result))
					return from(actions)
				})
			), SaveError, "Error saving Terms and Conditions!!")
		);
	});

	eSignEnvelopesLoaded$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<ESignEnvelopesLoaded>(CommonActionTypes.ESignEnvelopesLoaded),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					if (action.checkExpiredEnvelopes)
					{
						const salesAgreementStatus = store.salesAgreement.status;
						const changeOrderStatus = store.changeOrder.currentChangeOrder?.salesStatusDescription;
						const draftESignEnvelope = store.changeOrder.currentChangeOrder?.eSignEnvelopes?.find(x => x.eSignStatusId === 1);
						if (draftESignEnvelope &&
							(salesAgreementStatus === Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE || salesAgreementStatus === Constants.AGREEMENT_STATUS_PENDING ||
								salesAgreementStatus === Constants.AGREEMENT_STATUS_APPROVED && changeOrderStatus === Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE))
						{
							let expiredDate = new Date(draftESignEnvelope.createdUtcDate);
							expiredDate.setDate(expiredDate.getDate() + 3);
							const today = new Date();

							if (today > expiredDate || salesAgreementStatus === Constants.AGREEMENT_STATUS_PENDING)
							{
								let envelopeDto = { ...draftESignEnvelope, eSignStatusId: 4 };

								const updateSag = salesAgreementStatus === Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE
									? this.salesAgreementService.setSalesAgreementStatus(store.salesAgreement.id, Constants.AGREEMENT_STATUS_PENDING)
									: of(store.salesAgreement);

								const updateCog = salesAgreementStatus === Constants.AGREEMENT_STATUS_APPROVED && changeOrderStatus === Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE
									? this.changeOrderService.updateJobChangeOrder([store.changeOrder.currentChangeOrder])
									: of([store.changeOrder.currentChangeOrder]);

								return this.changeOrderService.updateESignEnvelope(envelopeDto).pipe(
									combineLatest(
										updateSag,
										updateCog,
										this.contractService.deleteEnvelope(draftESignEnvelope.envelopeGuid),
										this.contractService.deleteSnapshot(store.changeOrder.currentChangeOrder.jobId, store.changeOrder.currentChangeOrder.id)
									),
									map(([eSignEnvelope, salesAgreement, changeOrders]) =>
									{
										return {
											eSignEnvelope,
											salesAgreement,
											changeOrders,
											job: store.job,
											salesAgreementStatus: salesAgreementStatus
										};
									}));
							}
						}
					}
					return of(null);
				}),
				switchMap(data =>
				{
					let actions = [];

					if (data)
					{
						const job: Job = _.cloneDeep(data.job);
						const statusUtcDate = data.salesAgreement.lastModifiedUtcDate;

						job.changeOrderGroups.map(co =>
						{
							if (co.salesStatusDescription === "OutforSignature")
							{
								co.salesStatusDescription = "Pending";
								co.salesStatusUTCDate = statusUtcDate;
								co.jobChangeOrderGroupSalesStatusHistories.push({
									jobChangeOrderGroupId: co.id,
									salesStatusId: SalesStatusEnum.Pending,
									createdUtcDate: statusUtcDate,
									salesStatusUtcDate: statusUtcDate
								});
							}

							if (co.salesStatusDescription === "OutforSignature" || co.salesStatusDescription === "Pending")
							{
								const envelopeIndex = co.eSignEnvelopes?.findIndex(x => x.eSignEnvelopeId === data.eSignEnvelope?.eSignEnvelopeId);
								if (envelopeIndex > -1)
								{
									co.eSignEnvelopes.splice(envelopeIndex, 1);
									if (co.envelopeId === data.eSignEnvelope?.envelopeGuid)
									{
										co.envelopeId = null;
									}
								}
							}
						});

						actions.push(new CurrentChangeOrderPending(statusUtcDate, data.eSignEnvelope?.eSignEnvelopeId));
						actions.push(new JobUpdated(job));

						if (data.salesAgreementStatus === Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE)
						{
							actions.push(new SalesAgreementSaved(data.salesAgreement));
						}
						else if (data.salesAgreementStatus === Constants.AGREEMENT_STATUS_APPROVED)
						{
							actions.push(new ChangeOrderActions.SetChangingOrder(true, null, false));
						}
					}

					return from(actions);
				})
			), SaveError, "Error deleting expired envelope!!")
		)
	);

	currentChangeOrderOutForSignature$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CurrentChangeOrderOutForSignature>(ChangeOrderActionTypes.CurrentChangeOrderOutForSignature),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				const plans = _.cloneDeep(store.plan.plans);
				const changeOrderPlanOptions = _.flatMap(store.changeOrder.currentChangeOrder?.jobChangeOrders, co => co.jobChangeOrderPlanOptions) || [];
				const baseHouseOption = changeOrderPlanOptions.find(option => option.action === 'Add' && option.integrationKey === '00001');

				let selectedPlan = plans.find(plan => plan.id === store.plan.selectedPlan);
				if (selectedPlan && baseHouseOption)
				{
					selectedPlan.price = baseHouseOption.listPrice;
					return of(new PlansLoaded(plans));
				}

				return NEVER;
			})
		);
	});

	changeOrdersCreated$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<ChangeOrdersCreated>(ChangeOrderActionTypes.ChangeOrdersCreated),
			withLatestFrom(this.store),
			switchMap(([action, store]) =>
			{
				let buyerChangeOrderGroup = action.changeOrders.find(co => co.jobChangeOrders.some(c => c.jobChangeOrderTypeDescription === 'BuyerChangeOrder'));
				if (buyerChangeOrderGroup && store.changeOrder?.changeInput)
				{
					let newInput = { ...store.changeOrder.changeInput } as ChangeInput;

					newInput.buyers = mergeSalesChangeOrderBuyers(store.salesAgreement.buyers, buyerChangeOrderGroup);

					const trust = this.changeOrderService.mergeSalesChangeOrderTrusts(store.salesAgreement, buyerChangeOrderGroup);

					if (trust)
					{
						newInput.trustName = trust.trustName;
						newInput.isTrustNa = trust.isTrustNa;
					}

					return of(new ChangeInputInitialized(newInput));
				}

				return NEVER;
			})
		);
	});

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private changeOrderService: ChangeOrderService,
		private treeService: TreeService,
		private optionService: OptionService,
		private planService: PlanService,
		private salesAgreementService: SalesAgreementService,
		private contractService: ContractService,
		private modalService: ModalService,
		private liteService: LiteService) { }
}
