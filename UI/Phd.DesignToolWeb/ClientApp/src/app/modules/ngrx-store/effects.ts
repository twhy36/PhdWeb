import { Injectable } from '@angular/core';

import { Action, Store, select } from '@ngrx/store';
import { Effect, Actions, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs/Observable';
import * as _ from 'lodash';

import { CommonActionTypes, LoadScenario, LoadError, ScenarioLoaded, LoadSalesAgreement, SalesAgreementLoaded, LoadSpec, JobLoaded, ESignEnvelopesLoaded } from './actions';
import { tryCatch } from './error.action';
import { ScenarioService } from '../core/services/scenario.service';
import { TreeService } from '../core/services/tree.service';
import { switchMap, combineLatest, map, concat, scan, filter, take, distinct, withLatestFrom, tap } from 'rxjs/operators';
import { OptionService } from '../core/services/option.service';
import { LotService } from '../core/services/lot.service';
import { OrganizationService } from '../core/services/organization.service';
import { from } from 'rxjs/observable/from';
import { of } from 'rxjs/observable/of';
import { setTreePointsPastCutOff, mergeIntoTree, updateWithNewTreeVersion, mapAttributes } from '../shared/classes/tree.utils';
import { JobService } from '../core/services/job.service';
import { IdentityService } from 'phd-common/services';
import { DecisionPoint, Choice } from '../shared/models/tree.model.new';
import { ModalService } from '../core/services/modal.service';
import { PlanService } from '../core/services/plan.service';
import { OpportunityService } from '../core/services/opportunity.service';
import { LoadPlans, PlansLoaded, PlanActionTypes } from './plan/actions';
import { LoadLots, LotsLoaded, LotActionTypes } from './lot/actions';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { SalesAgreementService } from '../core/services/sales-agreement.service';
import { ChangeOrderService } from '../core/services/change-order.service';
import { ChangeOrderChoice, ChangeOrderGroup } from '../shared/models/job-change-order.model';
import { Job } from '../shared/models/job.model';
import { SalesAgreementCreated, SalesAgreementActionTypes } from './sales-agreement/actions';
import { ContractService } from '../core/services/contract.service';
import { TemplatesLoaded } from './contract/actions';
import { Claims, Permission } from 'phd-common/models';
import { SalesCommunity } from '../shared/models/community.model';
import { IMarket } from '../shared/models/market';
import { SalesAgreementInfo } from '../shared/models/sales-agreement.model';
import { SavePendingJio, CreateJobChangeOrders, CreatePlanChangeOrder } from './change-order/actions';
import { EMPTY as empty } from 'rxjs';
import { State, canDesign, showSpinner } from './reducers';
import { SpinnerService } from 'phd-common/services/spinner.service';

@Injectable()
export class CommonEffects
{
	@Effect()
	loadScenario$: Observable<Action> = this.actions$.pipe(
		ofType<LoadScenario>(CommonActionTypes.LoadScenario),
		tryCatch(source => source.pipe(
			switchMap(action => this.scenarioService.getScenario(action.scenarioId)),
			switchMap(scenario =>
			{
				return this.treeService.getTree(scenario.treeVersionId).pipe(
					combineLatest<any, any>(
						this.treeService.getRules(scenario.treeVersionId),
						this.optionService.getPlanOptions(scenario.planId),
						this.treeService.getOptionImages(scenario.treeVersionId),
						this.lotService.getLot(scenario.lotId),
						this.planService.getWebPlanMappingByPlanId(scenario.planId),
						this.oppService.getOpportunityContactAssoc(scenario.opportunityId)
					),
					map(([tree, rules, options, optionImages, lot, webPlanMapping, opportunity]) => { return { tree, rules, options, optionImages, lot, webPlanMapping, opportunity }; }),
					updateWithNewTreeVersion(scenario, this.treeService),
					map(data =>
					{
						// If there's a lot in the scenario and...
						// The lot's status is not Available and...
						// There is no sales agreement
						let lotNoLongerAvailable = false;

						if (scenario.lotId && data.lot && data.lot.lotStatusDescription !== 'Available')
						{
							// Then deselect the lot and gank it!
							scenario.lotId = null;
							lotNoLongerAvailable = true;
						}

						let isSpecScenario = false;

						if (data.lot)
						{
							isSpecScenario = data.lot.lotBuildTypeDesc === 'Spec';
						}

						scenario.scenarioChoices = data.selectedChoices;

						return { scenario, ...data, lotNoLongerAvailable, isSpecScenario };
					})
				);
			}),
			switchMap(result =>
			{
				result.scenario.scenarioChoices.forEach(choice =>
				{
					const c: Choice = _.flatMap(result.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)))
						.find(ch => ch.id === choice.choiceId);

					if (c)
					{
						c.quantity = choice.choiceQuantity;
						c.selectedAttributes = choice.selectedAttributes;
					}
				});

				if (result.isSpecScenario)
				{
					return this.jobService.getJobByLotId(result.scenario.lotId).pipe(
						switchMap(job => {
							if (job && job.length)
							{
								return this.orgService.getSalesCommunityByFinancialCommunityId(result.tree.financialCommunityId).pipe(
									combineLatest(this.identityService.getClaims(), this.identityService.getAssignedMarkets()),
									switchMap(([sc, claims, markets]: [SalesCommunity, Claims, IMarket[]]) =>
									{
										return this.treeService.getChoiceCatalogIds(job[0].jobChoices).pipe(
											map(res =>
											{
												job[0].jobChoices = res;

												return [sc, job, claims, markets];
											})
										);
									}),
									switchMap(([sc, job, claims, markets]: [SalesCommunity, Job[], Claims, IMarket[]]) =>
									{
										return of({ job, salesCommunity: sc, claims, markets, tree: result.tree, options: result.options }).pipe(
											//do this before checking cutoffs
											mergeIntoTree(job[0].jobChoices, job[0].jobPlanOptions, this.treeService),
											map(res =>
											{
												//add selections from the job into the tree
												res.job[0].jobChoices.filter(ch => !result.scenario.scenarioChoices.some(sc => sc.choiceId === ch.dpChoiceId)).forEach(choice =>
												{
													const c = _.flatMap(result.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)))
														.find(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId);

													if (c)
													{
														c.quantity = choice.dpChoiceQuantity;
														c.selectedAttributes = mapAttributes(choice);
													}
												});

												return res;
											})
										);
									}),
									map(res =>
									{
										setTreePointsPastCutOff(result.tree, res.job[0]);

										const pointsPastCutoff = _.flatMap(result.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points))
											.filter(pt => pt.isPastCutOff);
										let jobChoices = [];

										let needsOverride = false;
										let canOverride = res.claims.SalesAgreements && !!(res.claims.SalesAgreements & Permission.Override) && res.markets.some(m => m.number === res.salesCommunity.market.number);

										if (pointsPastCutoff.length > 0)
										{
											// check if point is part of scenario or specJIO
											res.job[0].changeOrderGroups.forEach(changeOrderGroup =>
											{
												changeOrderGroup.jobChangeOrders[0].jobChangeOrderChoices.forEach(jobChoice =>
												{
													if (jobChoice.action === 'Add')
													{
														jobChoices.push({ choiceId: jobChoice.dpChoiceId, overrideNote: null, quantity: jobChoice.dpChoiceQuantity });
													}
													else if (jobChoice.action === 'Delete')
													{
														jobChoices = jobChoices.filter(choice => choice.choiceId !== jobChoice.dpChoiceId);
													}
												});
											});

											pointsPastCutoff.forEach((point: DecisionPoint) =>
											{
												point.choices.forEach(choice =>
												{
													const coJobChoice = jobChoices.find(jcChoice => jcChoice.choiceId === choice.id);

													if (coJobChoice)
													{
														if (coJobChoice.quantity !== choice.quantity)
														{
															needsOverride = true;
														}
													}
													else
													{
														if (choice.quantity > 0)
														{
															needsOverride = true;
														}
													}
												});
											});
										}

										return { ...result, needsOverride, canOverride, pointsPastCutoff, jobChoices, salesCommunity: res.salesCommunity, job: res.job[0] };
									})
								);
							}
							else
							{
								return of({ ...result, salesCommunity: null, pointsPastCutoff: null, canOverride: false, jobChoices: null, needsOverride: false, job: null });
							}
						})
					);
				}
				else
				{
					return of({ ...result, salesCommunity: null, pointsPastCutoff: null, canOverride: false, jobChoices: null, needsOverride: false, job: null });
				}
			}),
			switchMap(result =>
			{
				let overrideNote: string;
				let overrode = false;

				if (result.needsOverride && result.canOverride)
				{
					return this.modalService.showOverrideModal(`<div>Some of your scenario choices are Past Cutoff date/stage and will need to have an Cutoff Override.</div>`).pipe(map((modalResult) =>
					{
						if (modalResult !== 'cancel')
						{
							overrode = true;
							overrideNote = modalResult;
							result.pointsPastCutoff.forEach((point: DecisionPoint) =>
							{
								point.choices.forEach(choice =>
								{
									const coJobChoice = result.jobChoices.find(jcChoice => jcChoice.choiceId === choice.id);

									if (coJobChoice)
									{
										if (coJobChoice.quantity !== choice.quantity)
										{
											choice.overrideNote = overrideNote;
										}
									}
									else
									{
										if (choice.quantity > 0)
										{
											choice.overrideNote = overrideNote;
										}
									}
								});
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
					return this.modalService.showConfirmModal('Some of your scenario choices are Past Cutoff date/stage and will need to have an Cutoff Override.').pipe(map(() =>
					{
						result.pointsPastCutoff.forEach((point: DecisionPoint) =>
						{
							point.choices.forEach(choice =>
							{
								const coJobChoice = result.jobChoices.find(jcChoice => jcChoice.choiceId === choice.id);

								if (coJobChoice)
								{
									if (coJobChoice.quantity !== choice.quantity)
									{
										choice.quantity = coJobChoice.quantity;
									}
								}
								else
								{
									if (choice.quantity > 0)
									{
										choice.quantity = 0;
									}
								}
							});
						});

						return { ...result };
					}));
				}
				else
				{
					return of({ ...result });
				}
			}),
			switchMap(result =>
			{
				if (!result.isSpecScenario)
				{
					return this.orgService.getSalesCommunityByFinancialCommunityId(result.tree.financialCommunityId).pipe(map(sc =>
					{
						return { ...result, salesCommunity: sc, overrideNote: null };
					}));
				}
				else
				{
					return of({ ...result });
				}
			}),
			switchMap(result => {
				let actions: any[] = [
					new ScenarioLoaded(result.scenario, result.tree, result.rules, result.options, result.optionImages, result.lot, result.salesCommunity, result.lotNoLongerAvailable, result.opportunity, result.webPlanMapping, result.overrideNote, result.job),
				];
				if (result.opportunity && result.opportunity.opportunity && result.opportunity.opportunity.salesCommunityId) {
					actions.push(new LoadPlans(result.opportunity.opportunity.salesCommunityId));
					actions.push(new LoadLots(result.opportunity.opportunity.salesCommunityId));
				}
				return from(actions);
			})
		), LoadError, 'Error loading scenario!!')
	);

	@Effect()
	loadSalesAgreementOrSpec$: Observable<Action> = this.actions$.pipe(
		ofType<LoadSalesAgreement | LoadSpec | SalesAgreementCreated>(CommonActionTypes.LoadSalesAgreement, CommonActionTypes.LoadSpec, SalesAgreementActionTypes.SalesAgreementCreated),
		tryCatch(source => source.pipe(
			switchMap(action =>
			{
				if (action instanceof LoadSpec)
				{
					return this.jobService.loadJob(action.job.id).pipe(
						map(job => ({ job, salesAgreement: null, salesAgreementInfo: null }))
					);
				}
				else if (action instanceof SalesAgreementCreated)
				{
					return this.jobService.loadJob(action.salesAgreement.jobSalesAgreementAssocs[0].jobId, action.salesAgreement.id).pipe(
						map(job =>
						{
							return { job, salesAgreement: action.salesAgreement, salesAgreementInfo: null };
						})
					);
				}
				else
				{
					return forkJoin(
						this.salesAgreementService.getSalesAgreement(action.salesAgreementId),
						this.salesAgreementService.getSalesAgreementInfo(action.salesAgreementId)
					).pipe(
						switchMap(([sag, sagInfo]) =>
						{
							return this.jobService.loadJob(sag.jobSalesAgreementAssocs[0].jobId, sag.id).pipe(
								map(job =>
								{
									return { job, salesAgreement: sag, salesAgreementInfo: sagInfo || new SalesAgreementInfo() };
								})
							);
						})
					);
				}
			}),
			switchMap(result =>
			{
				const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(result.job.changeOrderGroups);
				let changeOrderChoices: ChangeOrderChoice[] = [];

				if (currentChangeOrder)
				{
					changeOrderChoices = this.changeOrderService.getJobChangeOrderChoices([currentChangeOrder])
				}

				let selectedPlan$ = result.salesAgreement && ['Void', 'Cancel'].indexOf(result.salesAgreement.status) !== -1 ? this.jobService.getSalesAgreementPlan(result.salesAgreement.id, result.job.id) : of(result.job.planId);

				return this.orgService.getSalesCommunityByFinancialCommunityId(result.job.financialCommunityId, true).pipe(
					combineLatest(
						this.treeService.getChoiceCatalogIds([...result.job.jobChoices, ...changeOrderChoices]),
						selectedPlan$
					),
					//assign divChoiceCatalogIDs to choices for job and current change order
					map(([sc, choices, jobPlanId]) =>
					{
						const currentChangeOrderGroup = new ChangeOrderGroup(currentChangeOrder);

						if (currentChangeOrderGroup)
						{
							_.flatMap(currentChangeOrderGroup.jobChangeOrders, co => co.jobChangeOrderChoices).forEach(ch =>
							{
								let ch1 = choices.find(c => c.dpChoiceId === ch.dpChoiceId);

								if (ch1)
								{
									ch.divChoiceCatalogId = ch1.divChoiceCatalogId;
								}
							});
						}

						const newResult = { ...result, job: { ...result.job, jobChoices: [...result.job.jobChoices] } };
						const changedChoices = [];

						newResult.job.jobChoices.forEach(ch =>
						{
							const ch1 = choices.find(c => c.dpChoiceId === ch.dpChoiceId);

							if (ch1)
							{
								changedChoices.push({ ...ch, divChoiceCatalogId: ch1.divChoiceCatalogId });
							}
							else
							{
								changedChoices.push({ ...ch });
							}
						});

						newResult.job.jobChoices = changedChoices;

						return { ...newResult, sc, currentChangeOrderGroup, jobPlanId };
					})
				);
			}),
			map(result =>
			{
				if (result.currentChangeOrderGroup)
				{
					//change order stuff
					const selectedChoices = this.changeOrderService.getSelectedChoices(result.job, result.currentChangeOrderGroup);
					const selectedHanding = this.changeOrderService.getSelectedHanding(result.job);
					const selectedPlanId = this.changeOrderService.getSelectedPlan(result.job);
					const selectedLotId = this.changeOrderService.getSelectedLot(result.job);
					const changeOrderPlanOptions = this.changeOrderService.getJobChangeOrderPlanOptions(result.currentChangeOrderGroup);

					return {
						...result,
						changeOrderGroup: result.currentChangeOrderGroup,
						selectedChoices,
						selectedHanding,
						selectedPlanId,
						selectedLotId,
						changeOrderPlanOptions
					};
				}
				else
				{
					return {
						...result,
						changeOrderGroup: null,
						selectedChoices: result.job.jobChoices,
						selectedHanding: null,
						selectedPlanId: result.jobPlanId,
						selectedLotId: result.job.lotId,
						changeOrderPlanOptions: null
					};
				}
			}),
			switchMap(result =>
			{
				return this.changeOrderService.getTreeVersionIdByJobPlan(result.selectedPlanId).pipe(
					switchMap(treeVersionId =>
					{
						return this.treeService.getTree(treeVersionId).pipe(
							combineLatest<any, any>(
								this.treeService.getRules(treeVersionId, true),
								this.optionService.getPlanOptions(result.selectedPlanId, null, true),
								this.treeService.getOptionImages(treeVersionId, [], null, true),
								this.planService.getWebPlanMappingByPlanId(result.selectedPlanId),
								this.lotService.getLot(result.selectedLotId)
							),
							map(([tree, rules, options, images, mappings, lot]) =>
							{
								return {
									tree,
									rules,
									options,
									images,
									job: result.job,
									mappings,
									lot,
									sc: result.sc,
									changeOrder: result.changeOrderGroup,
									selectedHanding: result.selectedHanding,
									selectedChoices: result.selectedChoices,
									selectedPlanId: result.selectedPlanId,
									salesAgreement: result.salesAgreement,
									salesAgreementInfo: result.salesAgreementInfo
								};
							}),
							mergeIntoTree(
								[...result.job.jobChoices, ...(result.changeOrderGroup ? _.flatMap(result.changeOrderGroup.jobChangeOrders.map(co => co.jobChangeOrderChoices.filter(c => c.action === 'Add'))) : [])],
								[...result.job.jobPlanOptions, ...((result.changeOrderGroup && result.changeOrderGroup.salesStatusDescription !== 'Pending') ? result.changeOrderPlanOptions : [])],
								this.treeService,
								result.changeOrderGroup),
							map(data =>
							{
								setTreePointsPastCutOff(data.tree, data.job);

								return data;
							})
						);
					})
				);
			}),
			switchMap(result =>
			{
				if (result.salesAgreement && result.salesAgreementInfo) 
				{
					return <Observable<Action>>from([
						new SalesAgreementLoaded(result.salesAgreement, result.salesAgreementInfo, result.job, result.sc, result.selectedChoices, result.selectedPlanId, result.selectedHanding, result.tree, result.rules, result.options, result.images, result.mappings, result.changeOrder, result.lot),
						new LoadLots(result.sc.id),
						new LoadPlans(result.sc.id)
					]).pipe(
						//fetch ESignEnvelopes after everything is loaded
						concat(
							this.jobService.getESignEnvelopes(result.job).pipe(
								map(jobEnvelopes => new ESignEnvelopesLoaded(jobEnvelopes))
							),

							//fetch contract templates
							this.contractService.getTemplates(result.sc.market.id, result.job.financialCommunityId).pipe(
								map(templates => [...templates, { displayName: "JIO", displayOrder: 2, documentName: "JIO", templateId: 0, templateTypeId: 4, marketId: 0, version: 0 }]),
								map(templates => new TemplatesLoaded(templates))
							)
						)
					);
				}
				else 
				{
					return <Observable<Action>>from([new JobLoaded(result.job, result.salesAgreement, result.sc, result.selectedChoices, result.selectedPlanId, result.selectedHanding, result.tree, result.rules, result.options, result.images, result.mappings, result.changeOrder, result.lot),
					...(!result.salesAgreement ? [new LoadLots(result.sc.id)] : []),
					...(!result.salesAgreement ? [new LoadPlans(result.sc.id)] : []),
					...(!result.salesAgreement ? [new TemplatesLoaded([{ displayName: "JIO", displayOrder: 2, documentName: "JIO", templateId: 0, templateTypeId: 4, marketId: 0, version: 0 }])] : [])
					]);
				}
			})
		), LoadError, "Error loading sales agreement!!")
	);

	/**
	 * Runs SavePendingJio when SA, Plans, and Lots have all loaded.
	 * This is to make sure we have the most current data when the SA loads.
	 * Same for CreateJobChangeOrders
	**/
	@Effect()
	updatePricingOnInit$: Observable<Action> = this.actions$.pipe(
		ofType<SalesAgreementLoaded | PlansLoaded | LotsLoaded | LoadSalesAgreement>(CommonActionTypes.SalesAgreementLoaded, PlanActionTypes.PlansLoaded, LotActionTypes.LotsLoaded),
		scan<Action, any>((curr, action) =>
		{
			if (action instanceof LoadSalesAgreement)
			{
				return { ...curr, sagLoaded: false, plansLoaded: false, lotsLoaded: false, salesAgreement: null, currentChangeOrder: null };
			}

			if (action instanceof SalesAgreementLoaded)
			{
				return { ...curr, sagLoaded: true, salesAgreement: action.salesAgreement, currentChangeOrder: action.changeOrder };
			}
			else if (action instanceof PlansLoaded)
			{
				return { ...curr, plansLoaded: true };
			}
			else if (action instanceof LotsLoaded)
			{
				return { ...curr, lotsLoaded: true };
			}
			else
			{
				return curr; //should never get here
			}
		}, { lotsLoaded: false, plansLoaded: false, sagLoaded: false, salesAgreement: null, currentChangeOrder: null }),
		filter(res => res.lotsLoaded && res.plansLoaded && res.sagLoaded),
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
						else if (jco.some(co => co.jobChangeOrderTypeDescription === 'Choice/Attribute' || co.jobChangeOrderTypeDescription === 'Elevation'))
						{
							return of(new CreateJobChangeOrders());
						}
					}
					else
					{
						return empty;
					}
				})
			);
		})
	);

	@Effect({dispatch: false})
	showLoadingSpinner$: Observable<any> = this.actions$.pipe(
		withLatestFrom(this.store.pipe(select(showSpinner))),
		map(([action, showSpinner]) => {
			return showSpinner;
		}),
		scan((prev, current) => ({prev: prev.current, current: current}) , {prev: false, current: false}),
		tap((showSpinnerScan: {prev: boolean; current: boolean}) => {
			if (showSpinnerScan.prev !== showSpinnerScan.current)
			{
				this.spinnerService.showSpinner(showSpinnerScan.current);
			}
		}));

	constructor(
		private actions$: Actions,
		private store: Store<State>,
		private scenarioService: ScenarioService,
		private treeService: TreeService,
		private optionService: OptionService,
		private lotService: LotService,
		private orgService: OrganizationService,
		private jobService: JobService,
		private identityService: IdentityService,
		private modalService: ModalService,
		private planService: PlanService,
		private oppService: OpportunityService,
		private salesAgreementService: SalesAgreementService,
		private changeOrderService: ChangeOrderService,
		private contractService: ContractService,
		private spinnerService: SpinnerService) { }
}
