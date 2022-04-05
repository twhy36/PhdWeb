import { Injectable } from '@angular/core';

import { Action, Store, select } from '@ngrx/store';
import { Actions, ofType, createEffect } from '@ngrx/effects';
import { Observable, EMPTY as empty, from, of, forkJoin, combineLatest } from 'rxjs';
import { switchMap, map, concat, scan, filter, distinct, withLatestFrom, tap } from 'rxjs/operators';
import * as _ from 'lodash';

import {
	SalesCommunity, ChangeOrderChoice, ChangeOrderGroup, Job, IMarket, SalesAgreementInfo, DecisionPoint, Choice,
	IdentityService, SpinnerService, Claims, Permission, MyFavorite, ModalService, TimeOfSaleOptionPrice
} from 'phd-common';

import { CommonActionTypes, LoadScenario, LoadError, ScenarioLoaded, LoadSalesAgreement, SalesAgreementLoaded, LoadSpec, JobLoaded, ESignEnvelopesLoaded } from './actions';
import { tryCatch } from './error.action';
import { ScenarioService } from '../core/services/scenario.service';
import { TreeService } from '../core/services/tree.service';
import { OptionService } from '../core/services/option.service';
import { LotService } from '../core/services/lot.service';
import { OrganizationService } from '../core/services/organization.service';
import { setTreePointsPastCutOff, mergeIntoTree, updateWithNewTreeVersion, mapAttributes } from '../shared/classes/tree.utils';
import { JobService } from '../core/services/job.service';
import { PlanService } from '../core/services/plan.service';
import { OpportunityService } from '../core/services/opportunity.service';
import { LoadPlans, PlansLoaded, PlanActionTypes } from './plan/actions';
import { LoadLots, LotsLoaded, LotActionTypes } from './lot/actions';
import { SalesAgreementService } from '../core/services/sales-agreement.service';
import { ChangeOrderService } from '../core/services/change-order.service';
import { SalesAgreementCreated, SalesAgreementActionTypes } from './sales-agreement/actions';
import { ContractService } from '../core/services/contract.service';
import { TemplatesLoaded } from './contract/actions';
import { SavePendingJio, CreateJobChangeOrders, CreatePlanChangeOrder } from './change-order/actions';
import { State, canDesign, showSpinner } from './reducers';
import { FavoriteService } from '../core/services/favorite.service';
import { LiteService } from '../core/services/lite.service';
import { UpdateReplaceOptionPrice } from './job/actions';

@Injectable()
export class CommonEffects
{
	loadScenario$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<LoadScenario>(CommonActionTypes.LoadScenario),
			tryCatch(source => source.pipe(
				switchMap(action => this.scenarioService.getScenario(action.scenarioId)),
				switchMap(scenario => {
					const isPhdLite = !scenario.treeVersionId
						|| this.liteService.checkLiteScenario(scenario?.scenarioChoices, scenario?.scenarioOptions);
					
					const getTree = !isPhdLite ? this.treeService.getTree(scenario.treeVersionId) : of(null);
					const getRules = !isPhdLite ? this.treeService.getRules(scenario.treeVersionId) : of(null);
					const getPlanOptions = !isPhdLite ? this.optionService.getPlanOptions(scenario.planId) : of(null);
					const getOptionImages = !isPhdLite ? this.treeService.getOptionImages(scenario.treeVersionId) : of(null);
					
					return combineLatest([
						getTree,
						getRules,
						getPlanOptions,
						getOptionImages,
						this.lotService.getLot(scenario.lotId),
						combineLatest([
							this.planService.getWebPlanMappingByPlanId(scenario.planId),
							this.oppService.getOpportunityContactAssoc(scenario.opportunityId)
						])
					]).pipe(
						map(([tree, rules, options, optionImages, lot, [webPlanMapping, opportunity]]) => {
							if (optionImages)
							{
								// apply images to options
								options.forEach(option => {
									let filteredImages = optionImages.filter(x => x.integrationKey === option.financialOptionIntegrationKey);

									if (filteredImages.length) {
										// make sure they're sorted properly
										option.optionImages = filteredImages.sort((a, b) => a.sortKey < b.sortKey ? -1 : 1);
									}
								});								
							}

							return { tree, rules, options, optionImages, lot, webPlanMapping, opportunity };
						}),
						updateWithNewTreeVersion(scenario, this.treeService),
						map(data => {
							// If there's a lot in the scenario and...
							// The lot's status is not Available and...
							// There is no sales agreement
							let lotNoLongerAvailable = false;

							if (scenario.lotId && data.lot && data.lot.lotStatusDescription !== 'Available') {
								// Then deselect the lot and gank it!
								scenario.lotId = null;
								lotNoLongerAvailable = true;
							}

							let isSpecScenario = false;

							if (data.lot) {
								isSpecScenario = data.lot.lotBuildTypeDesc === 'Spec';
							}

							scenario.scenarioChoices = data.selectedChoices;

							return { scenario, ...data, lotNoLongerAvailable, isSpecScenario };
						})
					);
				}),
				switchMap(result => {
					result.scenario.scenarioChoices.forEach(choice => {
						const c: Choice = _.flatMap(result.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)))
							.find(ch => ch.id === choice.choiceId);

						if (c) {
							c.quantity = choice.choiceQuantity;
							c.selectedAttributes = choice.selectedAttributes;
						}
					});

					if (result.isSpecScenario) {
						return this.jobService.getJobByLotId(result.scenario.lotId).pipe(
							switchMap(job => {
								if (job && job.length) {
									return combineLatest([
										this.orgService.getSalesCommunityByFinancialCommunityId(result.tree.financialCommunityId, true),
										this.identityService.getClaims(), 
										this.identityService.getAssignedMarkets()
									]).pipe(
										switchMap(([sc, claims, markets]: [SalesCommunity, Claims, IMarket[]]) => {
											return this.treeService.getChoiceCatalogIds(job[0].jobChoices).pipe(
												map(res => {
													job[0].jobChoices = res;
													
													return [sc, job, claims, markets];
												})
											);
										}),
										switchMap(([sc, job, claims, markets]: [SalesCommunity, Job[], Claims, IMarket[]]) => {
											return of({ job, salesCommunity: sc, claims, markets, tree: result.tree, options: result.options }).pipe(
												//do this before checking cutoffs
												mergeIntoTree(job[0].jobChoices, job[0].jobPlanOptions, this.treeService, null, false),
												map(res => {
													//add selections from the job into the tree
													res.job[0].jobChoices.filter(ch => !result.scenario.scenarioChoices.some(sc => sc.choiceId === ch.dpChoiceId)).forEach(choice => {
														const c = _.flatMap(result.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)))
															.find(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId);

														if (c) {
															c.quantity = choice.dpChoiceQuantity;
															c.selectedAttributes = mapAttributes(choice);
														}
													});

													return res;
												})
											);
										}),
										map(res => {
											setTreePointsPastCutOff(result.tree, res.job[0]);

											const pointsPastCutoff = _.flatMap(result.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points))
												.filter(pt => pt.isPastCutOff);
											let jobChoices = [];

											let needsOverride = false;
											let canOverride = res.claims.SalesAgreements && !!(res.claims.SalesAgreements & Permission.Override) && res.markets.some(m => m.number === res.salesCommunity.market.number);

											if (pointsPastCutoff.length > 0) {
												// check if point is part of scenario or specJIO
												res.job[0].changeOrderGroups.forEach(changeOrderGroup => {
													changeOrderGroup.jobChangeOrders[0].jobChangeOrderChoices.forEach(jobChoice => {
														if (jobChoice.action === 'Add') {
															jobChoices.push({ choiceId: jobChoice.dpChoiceId, overrideNote: null, quantity: jobChoice.dpChoiceQuantity });
														}
														else if (jobChoice.action === 'Delete') {
															jobChoices = jobChoices.filter(choice => choice.choiceId !== jobChoice.dpChoiceId);
														}
													});
												});

												pointsPastCutoff.forEach((point: DecisionPoint) => {
													point.choices.forEach(choice => {
														const coJobChoice = jobChoices.find(jcChoice => jcChoice.choiceId === choice.id);

														if (coJobChoice) {
															if (coJobChoice.quantity !== choice.quantity) {
																needsOverride = true;
															}
														}
														else {
															if (choice.quantity > 0) {
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
								else {
									return of({ ...result, salesCommunity: null, pointsPastCutoff: null, canOverride: false, jobChoices: null, needsOverride: false, job: null });
								}
							})
						);
					}
					else {
						return of({ ...result, salesCommunity: null, pointsPastCutoff: null, canOverride: false, jobChoices: null, needsOverride: false, job: null });
					}
				}),
				switchMap(result => {
					let overrideNote: string;
					let overrode = false;

					if (result.needsOverride && result.canOverride) {
						return this.modalService.showOverrideModal(`<div>Some of your scenario choices are Past Cutoff date/stage and will need to have an Cutoff Override.</div>`).pipe(map((modalResult) => {
							if (modalResult !== 'cancel') {
								overrode = true;
								overrideNote = modalResult;
								result.pointsPastCutoff.forEach((point: DecisionPoint) => {
									point.choices.forEach(choice => {
										const coJobChoice = result.jobChoices.find(jcChoice => jcChoice.choiceId === choice.id);

										if (coJobChoice) {
											if (coJobChoice.quantity !== choice.quantity) {
												choice.overrideNote = overrideNote;
											}
										}
										else {
											if (choice.quantity > 0) {
												choice.overrideNote = overrideNote;
											}
										}
									});
								});

								return { ...result, overrideNote: overrideNote, overrode: overrode };
							}
							else {
								return { ...result, overrideNote: null, overrode: false };
							}
						}));
					}
					else {
						return of({ ...result, overrideNote: null, overrode: false });
					}
				}),
				switchMap(result => {
					if (result.needsOverride && !result.overrode) {
						return this.modalService.showConfirmModal('Some of your scenario choices are Past Cutoff date/stage and will need to have an Cutoff Override.').pipe(map(() => {
							result.pointsPastCutoff.forEach((point: DecisionPoint) => {
								point.choices.forEach(choice => {
									const coJobChoice = result.jobChoices.find(jcChoice => jcChoice.choiceId === choice.id);

									if (coJobChoice) {
										if (coJobChoice.quantity !== choice.quantity) {
											choice.quantity = coJobChoice.quantity;
										}
									}
									else {
										if (choice.quantity > 0) {
											choice.quantity = 0;
										}
									}
								});
							});

							return { ...result };
						}));
					}
					else {
						return of({ ...result });
					}
				}),
				switchMap(result => {
					const financialCommunityId = result.tree?.financialCommunityId;
					const salesCommunityId = result.opportunity?.opportunity?.salesCommunityId

					if (!result.salesCommunity && (!!financialCommunityId || !!salesCommunityId)) 
					{
						const getSalesCommunity = !!financialCommunityId
							? this.orgService.getSalesCommunityByFinancialCommunityId(financialCommunityId, true)
							: this.orgService.getSalesCommunity(salesCommunityId);

						return getSalesCommunity.pipe(map(sc => {
							return { ...result, salesCommunity: sc, overrideNote: null };
						}));
					}
					else {
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
	});

	loadSalesAgreementOrSpec$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<LoadSalesAgreement | LoadSpec | SalesAgreementCreated>(CommonActionTypes.LoadSalesAgreement, CommonActionTypes.LoadSpec, SalesAgreementActionTypes.SalesAgreementCreated),
			tryCatch(source => source.pipe(
				switchMap(action => {
					if (action instanceof LoadSpec) {
						return this.jobService.loadJob(action.job.id).pipe(
							map(job => ({ job, salesAgreement: null, salesAgreementInfo: null }))
						);
					}
					else if (action instanceof SalesAgreementCreated) {
						return this.jobService.loadJob(action.salesAgreement.jobSalesAgreementAssocs[0].jobId, action.salesAgreement.id).pipe(
							map(job => {
								return { job, salesAgreement: action.salesAgreement, salesAgreementInfo: null };
							})
						);
					}
					else {
						return forkJoin([
							this.salesAgreementService.getSalesAgreement(action.salesAgreementId),
							this.salesAgreementService.getSalesAgreementInfo(action.salesAgreementId)
						]).pipe(
							switchMap(([sag, sagInfo]) => {
								return this.jobService.loadJob(sag.jobSalesAgreementAssocs[0].jobId, sag.id).pipe(
									map(job => {
										return { job, salesAgreement: sag, salesAgreementInfo: sagInfo || new SalesAgreementInfo() };
									})
								);
							})
						);
					}
				}),
				switchMap(result => {
					const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(result.job.changeOrderGroups);
					let changeOrderChoices: ChangeOrderChoice[] = [];

					if (currentChangeOrder) {
						changeOrderChoices = this.changeOrderService.getJobChangeOrderChoices([currentChangeOrder])
					}

					let selectedPlan$ = result.salesAgreement && ['Void', 'Cancel'].indexOf(result.salesAgreement.status) !== -1 ? this.jobService.getSalesAgreementPlan(result.salesAgreement.id, result.job.id) : of(result.job.planId);

					return combineLatest([
						this.orgService.getSalesCommunityByFinancialCommunityId(result.job.financialCommunityId, true),
						this.treeService.getChoiceCatalogIds([...result.job.jobChoices, ...changeOrderChoices]),
						selectedPlan$
					]).pipe(
						//assign divChoiceCatalogIDs to choices for job and current change order
						map(([sc, choices, jobPlanId]) => {
							const currentChangeOrderGroup = new ChangeOrderGroup(currentChangeOrder);

							if (currentChangeOrderGroup) {
								_.flatMap(currentChangeOrderGroup.jobChangeOrders, co => co.jobChangeOrderChoices).forEach(ch => {
									let ch1 = choices.find(c => c.dpChoiceId === ch.dpChoiceId);

									if (ch1) {
										ch.divChoiceCatalogId = ch1.divChoiceCatalogId;
									}
								});
							}

							const newResult = { ...result, job: { ...result.job, jobChoices: [...result.job.jobChoices] } };
							const changedChoices = [];

							newResult.job.jobChoices.forEach(ch => {
								const ch1 = choices.find(c => c.dpChoiceId === ch.dpChoiceId);

								if (ch1) {
									changedChoices.push({ ...ch, divChoiceCatalogId: ch1.divChoiceCatalogId });
								}
								else {
									changedChoices.push({ ...ch });
								}
							});

							newResult.job.jobChoices = changedChoices;

							// Set divChoiceCatalogId in job change order groups
							_.flatMap(newResult.job.changeOrderGroups, cog => _.flatMap(cog.jobChangeOrders, co => co.jobChangeOrderChoices)).forEach(ch => {
								const choice = choices.find(c => c.dpChoiceId === ch.dpChoiceId);

								if (choice) {
									ch.divChoiceCatalogId = choice.divChoiceCatalogId;
								}
							});

							return { ...newResult, sc, currentChangeOrderGroup, jobPlanId };
						})
					);
				}),
				map(result => {
					if (result.currentChangeOrderGroup) {
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
					else {
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
				switchMap(result => {
					if (result.selectedPlanId) {
						const financialCommunity = result.sc?.financialCommunities?.find(f => f.id === result.job?.financialCommunityId);
						const isDesignPreviewEnabled = financialCommunity ? financialCommunity.isDesignPreviewEnabled : false;

						const getMyFavorites: Observable<MyFavorite[]> = 
							isDesignPreviewEnabled && result.salesAgreement && result.salesAgreement.id > 0 
							? this.favoriteService.loadMyFavorites(result.salesAgreement.id) 
							: of([]);

						const getTreeVersionIdByJobPlan$ = this.liteService.checkLiteAgreement(result.job, result.changeOrderGroup)
							? of(null)
							: this.changeOrderService.getTreeVersionIdByJobPlan(result.selectedPlanId);

						return combineLatest([
							getTreeVersionIdByJobPlan$,
							getMyFavorites
						]).pipe(
							switchMap(([treeVersionId, favorites]) => {
								const favoriteChoices = !!favorites ? _.flatMap(favorites, x => x.myFavoritesChoice) : [];
								const getFavoritesChoiceCatalogIds = !!favoriteChoices?.length ? this.treeService.getChoiceCatalogIds([...favoriteChoices]) : of([]);

								const getTree = treeVersionId ? this.treeService.getTree(treeVersionId) : of(null);
								const getRules = treeVersionId ? this.treeService.getRules(treeVersionId, true) : of(null);
								const getPlanOptions = treeVersionId ? this.optionService.getPlanOptions(result.selectedPlanId, null, true) : of([]);
								const getOptionImages = treeVersionId ? this.treeService.getOptionImages(treeVersionId, [], null, true) : of(null);
			
								return combineLatest([
									getTree,
									getRules,
									getPlanOptions,
									getOptionImages,
									this.planService.getWebPlanMappingByPlanId(result.selectedPlanId),
									combineLatest([
										this.lotService.getLot(result.selectedLotId),
										getFavoritesChoiceCatalogIds
									])
								]).pipe(
									map(([tree, rules, options, images, mappings, [lot, choices]]) => {
										if (choices?.length)
										{
											_.flatMap(favorites, fav => fav.myFavoritesChoice).forEach(ch => {
												let ch1 = choices.find(c => c.dpChoiceId === ch.dpChoiceId);
				
												if (ch1)
												{
													ch.divChoiceCatalogId = ch1.divChoiceCatalogId;
												}
											});
										}												

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
											salesAgreementInfo: result.salesAgreementInfo,
											myFavorites: favorites
										};
									}),
									mergeIntoTree(
										[
											...result.job.jobChoices.filter(jc => !result.changeOrderGroup || !_.flatMap(result.changeOrderGroup.jobChangeOrders.map(co => co.jobChangeOrderChoices)).some(coc => coc.action === 'Delete' && coc.dpChoiceId === jc.dpChoiceId)),
											...(result.changeOrderGroup ? _.flatMap(result.changeOrderGroup.jobChangeOrders.map(co => co.jobChangeOrderChoices.filter(c => c.action === 'Add'))) : [])
										],
										[...result.job.jobPlanOptions, ...((result.changeOrderGroup && result.changeOrderGroup.salesStatusDescription !== 'Pending') ? result.changeOrderPlanOptions : [])],
										this.treeService,
										result.changeOrderGroup,
										result.salesAgreement && ['OutforSignature', 'Signed', 'Approved', 'Closed'].indexOf(result.salesAgreement.status) !== -1),
									map(data => {
										if (data.tree)
										{
											setTreePointsPastCutOff(data.tree, data.job);
										}
										
										return data;
									})
								);
							})
						);
					}
					else {
						return this.lotService.getLot(result.selectedLotId).pipe(
							map(data => {
								return {
									tree: null,
									rules: null,
									options: null,
									images: null,
									job: result.job,
									mappings: null,
									lot: data,
									sc: result.sc,
									changeOrder: result.changeOrderGroup,
									selectedHanding: result.selectedHanding,
									selectedChoices: result.selectedChoices,
									selectedPlanId: result.selectedPlanId,
									salesAgreement: result.salesAgreement,
									salesAgreementInfo: result.salesAgreementInfo,
									myFavorites: null
								}
							})
						)
					}
				}),
				switchMap(result => {
					if (result.salesAgreement && result.salesAgreementInfo) {
						//make sure base price is locked in.
						let baseHouseOption = result.job.jobPlanOptions.find(o => o.jobOptionTypeName === 'BaseHouse');
						let selectedPlanPrice: { planId: number, listPrice: number } = null;

						if (['OutforSignature', 'Signed', 'Approved', 'Closed'].indexOf(result.salesAgreement.status) !== -1) {
							if (baseHouseOption) {
								selectedPlanPrice = { planId: result.selectedPlanId, listPrice: baseHouseOption ? baseHouseOption.listPrice : 0 };
							}

							if (result.changeOrder && result.changeOrder.salesStatusDescription !== 'Pending') {
								let co = result.changeOrder.jobChangeOrders.find(co => co.jobChangeOrderPlanOptions && co.jobChangeOrderPlanOptions.some(po => po.integrationKey === '00001' && po.action === 'Add'));

								if (co) {
									selectedPlanPrice = { planId: result.selectedPlanId, listPrice: co.jobChangeOrderPlanOptions.find(po => po.action === 'Add' && po.integrationKey === '00001').listPrice };
								}
							}
						}

						// #353697 Update tracked prices if they have changed while the agreement is pending
						let timeOfSaleOptionPricesToUpdate: TimeOfSaleOptionPrice[] = [];

						if (result.salesAgreement.status === 'Pending' && result.job.timeOfSaleOptionPrices && result.job.timeOfSaleOptionPrices.length)
						{
							result.job.timeOfSaleOptionPrices.forEach(p =>
							{
								let opt = result.options.find(o => o.id === p.edhPlanOptionID);

								if (opt && opt.listPrice !== p.listPrice)
								{
									timeOfSaleOptionPricesToUpdate.push({
										edhJobID: p.edhJobID,
										edhPlanOptionID: p.edhPlanOptionID,
										listPrice: opt.listPrice,
										divChoiceCatalogID: p.divChoiceCatalogID,
										createdBy: p.createdBy,
										createdUtcDate: p.createdUtcDate,
										lastModifiedBy: p.lastModifiedBy,
										lastModifiedUtcDate: p.lastModifiedUtcDate
									} as TimeOfSaleOptionPrice);
								}
							});
						}

						return <Observable<Action>>from([
							new SalesAgreementLoaded(result.salesAgreement, result.salesAgreementInfo, result.job, result.sc, result.selectedChoices, result.selectedPlanId, result.selectedHanding, result.tree, result.rules, result.options, result.images, result.mappings, result.changeOrder, result.lot, result.myFavorites),
							new LoadLots(result.sc.id),
							new LoadPlans(result.sc.id, selectedPlanPrice),
							new UpdateReplaceOptionPrice(timeOfSaleOptionPricesToUpdate)
						]).pipe(
							//fetch ESignEnvelopes after everything is loaded
							concat(
								this.jobService.getESignEnvelopes(result.job).pipe(
									map(jobEnvelopes => new ESignEnvelopesLoaded(jobEnvelopes, true))
								),

								//fetch contract templates
								this.contractService.getTemplates(result.sc.market.id, result.job.financialCommunityId).pipe(
									map(templates => [...templates, { displayName: "JIO", displayOrder: 2, documentName: "JIO", templateId: 0, templateTypeId: 4, marketId: 0, version: 0 }]),
									map(templates => new TemplatesLoaded(templates))
								)
							)
						);
					}
					else {
						return <Observable<Action>>from([new JobLoaded(result.job, result.salesAgreement, result.sc, result.selectedChoices, result.selectedPlanId, result.selectedHanding, result.tree, result.rules, result.options, result.images, result.mappings, result.changeOrder, result.lot),
						...(!result.salesAgreement ? [new LoadLots(result.sc.id)] : []),
						...(!result.salesAgreement ? [new LoadPlans(result.sc.id)] : []),
						...(!result.salesAgreement ? [new TemplatesLoaded([{ displayName: "JIO", displayOrder: 2, documentName: "JIO", templateId: 0, templateTypeId: 4, marketId: 0, version: 0 }])] : [])
						]);
					}
				})
			), LoadError, "Error loading sales agreement!!")
		);
	});

	/**
	 * Runs SavePendingJio when SA, Plans, and Lots have all loaded.
	 * This is to make sure we have the most current data when the SA loads.
	 * Same for CreateJobChangeOrders
	**/
	updatePricingOnInit$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<SalesAgreementLoaded | PlansLoaded | LotsLoaded | LoadSalesAgreement>(CommonActionTypes.SalesAgreementLoaded, PlanActionTypes.PlansLoaded, LotActionTypes.LotsLoaded),
			scan<Action, any>((curr, action) => {
				if (action instanceof LoadSalesAgreement) {
					return { ...curr, sagLoaded: false, plansLoaded: false, lotsLoaded: false, salesAgreement: null, currentChangeOrder: null };
				}

				if (action instanceof SalesAgreementLoaded) {
					// Filter out actions in PHD Lite. Handled by updatePricingOnInitLite$() in lite effects.
					return { 
						...curr, 
						sagLoaded: true, 
						salesAgreement: action.salesAgreement, 
						currentChangeOrder: action.changeOrder, 
						isPhdLite: !action.tree || this.liteService.checkLiteAgreement(action.job, action.changeOrder)
					};
				}
				else if (action instanceof PlansLoaded) {
					return { ...curr, plansLoaded: true };
				}
				else if (action instanceof LotsLoaded) {
					return { ...curr, lotsLoaded: true };
				}
				else {
					return curr; //should never get here
				}
			}, { lotsLoaded: false, plansLoaded: false, sagLoaded: false, salesAgreement: null, currentChangeOrder: null }),
			filter(res => res.lotsLoaded && res.plansLoaded && res.sagLoaded && !res.isPhdLite),
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

	showLoadingSpinner$: Observable<any> = createEffect(
		() => this.actions$.pipe(
			withLatestFrom(this.store.pipe(select(showSpinner))),
			map(([action, showSpinner]) => {
				return showSpinner;
			}),
			scan((prev, current) => ({ prev: prev.current, current: current }), { prev: false, current: false }),
			tap((showSpinnerScan: { prev: boolean; current: boolean }) => {
				if (showSpinnerScan.prev !== showSpinnerScan.current) {
					this.spinnerService.showSpinner(showSpinnerScan.current);
				}
			})
		),
		{ dispatch: false }
	);

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
		private spinnerService: SpinnerService,
		private favoriteService: FavoriteService,
		private liteService: LiteService
	) { }
}
