import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom, map, combineLatest } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { from } from 'rxjs/observable/from';
import { forkJoin } from 'rxjs/observable/forkJoin';

import { ModalService } from '../../core/services/modal.service';
import { ChangeOrderService } from '../../core/services/change-order.service';
import
{
	ChangeOrderActionTypes, LoadError, CurrentChangeOrderLoaded, SetChangingOrder, ChangeInputInitialized,
	CreateJobChangeOrders, ChangeOrdersCreated, SaveError, CancelJobChangeOrder, CreateSalesChangeOrder, CreateNonStandardChangeOrder, CreatePlanChangeOrder, CancelPlanChangeOrder,
	CancelLotTransferChangeOrder, CancelSalesChangeOrder, SetCurrentChangeOrder, CancelNonStandardChangeOrder, SavePendingJio, CreateCancellationChangeOrder, CreateLotTransferChangeOrder,
	ResubmitChangeOrder, ChangeOrderOutForSignature
} from './actions';
import { ChangeInput, ChangeTypeEnum, ChangeOrderGroup, ChangeOrderHanding } from '../../shared/models/job-change-order.model';
import { TreeLoadedFromJob, SelectChoices } from '../scenario/actions';
import { ChangeOrdersCreatedForJob } from '../job/actions';
import { SelectLot } from '../lot/actions';
import { OpportunityLoaded } from '../opportunity/actions';
import { CommonActionTypes, SalesAgreementLoaded, JobLoaded } from '../actions';

import * as CommonActions from '../actions';
import * as ChangeOrderActions from '../change-order/actions';

import * as fromRoot from '../reducers';

import * as _ from "lodash";
import { TreeService } from '../../core/services/tree.service';
import { OptionService } from '../../core/services/option.service';
import { PlanService } from '../../core/services/plan.service';
import { ContractService } from '../../core/services/contract.service';

import { mergeIntoTree, setTreePointsPastCutOff } from '../../shared/classes/tree.utils';
import { SelectPlan } from '../plan/actions';
import { tryCatch } from '../error.action';
import { ESignEnvelope, ESignStatusEnum, ESignTypeEnum } from '../../shared/models/esign-envelope.model';
import { priceBreakdown } from '../reducers';


@Injectable()
export class ChangeOrderEffects
{
	@Effect()
	initializeChangeInput$: Observable<Action> = this.actions$.pipe(
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
				return of(new ChangeInputInitialized(newInput));
			})
		), LoadError, "Error initializing change input!!")
	);

	@Effect()
	createJobChangeOrders$: Observable<Action> = this.actions$.pipe(
		ofType<CreateJobChangeOrders>(ChangeOrderActionTypes.CreateJobChangeOrders),
		withLatestFrom(this.store, this.store.pipe(select(priceBreakdown))),
		tryCatch(source => source.pipe(
			switchMap(([action, store, priceBreakdown]) =>
			{
				let changePrice = !!store.salesAgreement
					? priceBreakdown.totalPrice - store.salesAgreement.salePrice
					: 0;

				const baseHouseOption = store.job.jobPlanOptions ? store.job.jobPlanOptions.find(x => x.jobOptionTypeName === 'BaseHouse') : null;
				const inputData = this.changeOrderService.getJobChangeOrderInputData(
					store.scenario.tree,
					store.changeOrder.currentChangeOrder,
					store.job,
					store.changeOrder.changeInput.handing,
					store.salesAgreement.id,
					baseHouseOption);
				const data = this.changeOrderService.mergePosData(
					inputData,
					store.changeOrder.currentChangeOrder,
					store.salesAgreement,
					store.changeOrder.changeInput,
					store.job.id);

				return this.changeOrderService.createJobChangeOrder(data, changePrice).pipe(
					switchMap(changeOrder =>
					{
						let jobChangeOrderChoices = this.changeOrderService.getJobChangeOrderChoices([changeOrder]);
						return this.treeService.getChoiceCatalogIds(jobChangeOrderChoices).pipe(
							map(choices => { return changeOrder })
						);
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

	@Effect()
	createSalesChangeOrder$: Observable<Action> = this.actions$.pipe(
		ofType<CreateSalesChangeOrder>(ChangeOrderActionTypes.CreateSalesChangeOrder),
		withLatestFrom(this.store, this.store.pipe(select(priceBreakdown))),
		tryCatch(source => source.pipe(
			switchMap(([action, store, priceBreakdown]) =>
			{
				const changePrice = priceBreakdown.totalPrice - store.salesAgreement.salePrice;

				const data = this.changeOrderService.getSalesChangeOrderData(
					store.changeOrder.currentChangeOrder,
					store.salesAgreement,
					store.changeOrder.changeInput,
					store.job.id,
					action.specSales);

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
	);

	@Effect()
	cancelJobChangeOrder$: Observable<Action> = this.actions$.pipe(
		ofType<CancelJobChangeOrder>(ChangeOrderActionTypes.CancelJobChangeOrder),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);
				const changeOrderId = currentChangeOrder ? currentChangeOrder.id : 0;
				const choices = this.changeOrderService.getOriginalChoicesAndAttributes(store.job, store.scenario.tree, (currentChangeOrder !== undefined) ? store.changeOrder.currentChangeOrder as ChangeOrderGroup : null);
				const handing = this.changeOrderService.getSelectedHanding(store.job);

				let actions: any[] = [
					new SetCurrentChangeOrder(changeOrderId),
					new SelectChoices(false, ...choices)
				];

				if (changeOrderId > 0)
				{
					actions.push(new CurrentChangeOrderLoaded(currentChangeOrder, handing));
				}
				else
				{
					actions.push(new SetChangingOrder(false, null, true, handing));
				}

				return from(actions);
			})
		), SaveError, "Error cancelling change order!!")
	);

	@Effect()
	createNonStandardChangeOrder: Observable<Action> = this.actions$.pipe(
		ofType<CreateNonStandardChangeOrder>(ChangeOrderActionTypes.CreateNonStandardChangeOrder),
		withLatestFrom(this.store, this.store.pipe(select(priceBreakdown))),
		tryCatch(source => source.pipe(
			switchMap(([action, store, priceBreakdown]) =>
			{
				let changePrice = !!store.salesAgreement
					? priceBreakdown.totalPrice - store.salesAgreement.salePrice
					: 0;

				const inputData = this.changeOrderService.getNonStandardChangeOrderData(
					store.job.id,
					store.salesAgreement.id,
					store.changeOrder.currentChangeOrder,
					action.options);
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

	@Effect()
	cancelNonStandardChangeOrder$: Observable<Action> = this.actions$.pipe(
		ofType<CancelNonStandardChangeOrder>(ChangeOrderActionTypes.CancelNonStandardChangeOrder),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);
				const changeOrderId = currentChangeOrder ? currentChangeOrder.id : 0;

				let actions = [];
				actions.push(new SetChangingOrder(false, null, true));

				if (changeOrderId > 0) {
					const handing = new ChangeOrderHanding();
					handing.handing = store.job.handing;
					actions.push(new CurrentChangeOrderLoaded(currentChangeOrder, handing));
				} else {
					actions.push(new SetCurrentChangeOrder(changeOrderId));
				}

				return from(actions);
			})
		), SaveError, "Error cancelling non-standard change order!!")
	);

	@Effect()
	createPlanChangeOrder: Observable<Action> = this.actions$.pipe(
		ofType<CreatePlanChangeOrder>(ChangeOrderActionTypes.CreatePlanChangeOrder),
		withLatestFrom(this.store, this.store.pipe(select(priceBreakdown))),
		tryCatch(source => source.pipe(
			switchMap(([action, store, priceBreakdown]) =>
			{
				let changePrice = !!store.salesAgreement
					? priceBreakdown.totalPrice - store.salesAgreement.salePrice
					: 0;

				const inputData = this.changeOrderService.getPlanChangeOrderData(
					store.scenario.tree,
					store.changeOrder.currentChangeOrder,
					store.job,
					store.plan.selectedPlan,
					store.salesAgreement.id,
					priceBreakdown.baseHouse);
				const data = this.changeOrderService.mergePosData(
					inputData,
					store.changeOrder.currentChangeOrder,
					store.salesAgreement,
					store.changeOrder.changeInput,
					store.job.id);

				return this.changeOrderService.createJobChangeOrder(data, changePrice);
			}),
			switchMap(changeOrder =>
			{
				let jobChangeOrderChoices = this.changeOrderService.getJobChangeOrderChoices([changeOrder]);
				return this.treeService.getChoiceCatalogIds(jobChangeOrderChoices).pipe(
					map(choices => { return changeOrder })
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

	@Effect()
	cancelPlanChangeOrder$: Observable<Action> = this.actions$.pipe(
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

	@Effect()
	createLotTransferChangeOrder: Observable<Action> = this.actions$.pipe(
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

	@Effect()
	cancelLotTransferChangeOrder$: Observable<Action> = this.actions$.pipe(
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

	@Effect()
	cancelSalesChangeOrder$: Observable<Action> = this.actions$.pipe(
		ofType<CancelSalesChangeOrder>(ChangeOrderActionTypes.CancelSalesChangeOrder),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(store.job.changeOrderGroups);
				const changeOrderId = currentChangeOrder ? currentChangeOrder.id : 0;

				let actions = [];
				actions.push(new SetChangingOrder(false, null, true));

				if (changeOrderId > 0) {
					const handing = new ChangeOrderHanding();
					handing.handing = store.job.handing;
					actions.push(new CurrentChangeOrderLoaded(currentChangeOrder, handing));
				} else {
					actions.push(new SetCurrentChangeOrder(changeOrderId));
				}

				return from(actions);
			})
		), SaveError, "Error cancelling sales change order!!")
	);

	@Effect()
	currentChangeOrderLoaded$: Observable<Action> = this.actions$.pipe(
		ofType<CurrentChangeOrderLoaded | SalesAgreementLoaded | JobLoaded>(ChangeOrderActionTypes.CurrentChangeOrderLoaded, CommonActionTypes.SalesAgreementLoaded, CommonActionTypes.JobLoaded),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				if (store.changeOrder && store.changeOrder.changeInput)
				{
					let newInput = { ...store.changeOrder.changeInput } as ChangeInput;

					newInput.buyers = this.changeOrderService.mergeSalesChangeOrderBuyers(store.salesAgreement.buyers, action.changeOrder);

					const trust = this.changeOrderService.mergeSalesChangeOrderTrusts(store.salesAgreement, store.changeOrder.currentChangeOrder);

					if (trust)
					{
						newInput.trustName = trust.trustName;
						newInput.isTrustNa = trust.isTrustNa;
					}

					newInput.changeOrderPlanId = store.plan.selectedPlan;

					if (store.job.lot && store.job.lot.lotBuildTypeDesc === 'Spec'
						&& ['Pending', 'OutforSignature', 'Signed'].indexOf(store.salesAgreement.status) !== -1
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

	@Effect()
	setCurrentChangeOrder$: Observable<Action> = this.actions$.pipe(
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
						mergeIntoTree(
							[...store.job.jobChoices, ...(currentChangeOrder && currentChangeOrder.salesStatusDescription === 'Pending' ? [] : jobChangeOrderChoices)],
							[...store.job.jobPlanOptions, ...(currentChangeOrder && currentChangeOrder.salesStatusDescription === 'Pending' ? [] : jobChangeOrderPlanOptions)],
							this.treeService,
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
		), LoadError, "Error setting current change order!!")
	);

	@Effect()
	savePendingJio$: Observable<Action> = this.actions$.pipe(
		ofType<SavePendingJio>(ChangeOrderActionTypes.SavePendingJio),
		withLatestFrom(this.store, this.store.pipe(select(priceBreakdown))),
		tryCatch(source => source.pipe(
			switchMap(([action, store, priceBreakdown]) =>
			{
				const isSpecSalePending = store.job.lot && store.job.lot.lotBuildTypeDesc === 'Spec' && store.salesAgreement.status === 'Pending';
				const typeDescription = isSpecSalePending ? 'BuyerChangeOrder' : 'SalesJIO';
				const jio = store.job.changeOrderGroups
					? store.job.changeOrderGroups.find(x => x.jobChangeOrders && x.jobChangeOrders.some(co => co.jobChangeOrderTypeDescription === typeDescription))
					: null;

				if (jio) {
					let jobHanding = new ChangeOrderHanding();
					jobHanding.handing = store.job.handing;
					let currentHanding = action.handing || (isSpecSalePending ? this.changeOrderService.getSelectedHanding(store.job) : jobHanding);
					
					const baseHouseOption = store.scenario.options ? store.scenario.options.find(o => o.isBaseHouse) : null;
					const inputData = this.changeOrderService.getJobChangeOrderInputData(store.scenario.tree,
						jio as ChangeOrderGroup,
						store.job,
						currentHanding,
						store.salesAgreement.id,
						baseHouseOption,
						!isSpecSalePending,
						priceBreakdown.baseHouse);

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

					return this.changeOrderService.createJobChangeOrder(isSpecSalePending ? data : inputData, priceBreakdown.totalPrice).pipe(
						switchMap(changeOrder => {
							let actions: any[] = [
								new ChangeOrdersCreatedForJob([changeOrder]),
								new ChangeOrdersCreated([changeOrder])
							];

							const buyerChangeOrder = changeOrder ? changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'BuyerChangeOrder') : null;
							if (isSpecSalePending && buyerChangeOrder) {
								let newInput = _.cloneDeep(store.changeOrder.changeInput);
								newInput.buyers = this.changeOrderService.mergeSalesChangeOrderBuyers(store.salesAgreement.buyers, changeOrder);
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
		), SaveError, "Error saving pending JIO!!")
	);

	@Effect()
	createCancellationChangeOrder$: Observable<Action> = this.actions$.pipe(
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

	/*
	 * Change Order Out For Signature
	 */
	@Effect()
	changeOrderOutForSignature$: Observable<Action> = this.actions$.pipe(
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
						eSignStatusId: ESignStatusEnum.Sent,
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

				if (action.isWetSign && action.setChangeOrder)
				{
					actions.push(new ChangeOrderActions.SetChangingOrder(false, null, false));
				}

				return from(actions);
			})
		), SaveError, 'Error setting change order out for signature!!')
	);

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private changeOrderService: ChangeOrderService,
		private treeService: TreeService,
		private optionService: OptionService,
		private planService: PlanService,
		private contractService: ContractService,
		private modalService: ModalService) { }
}
