import { Injectable } from '@angular/core';

import { Action, Store, select } from '@ngrx/store';
import { Actions, ofType, createEffect } from '@ngrx/effects';
import { switchMap, map, scan, withLatestFrom, tap, filter } from 'rxjs/operators';
import { combineLatest, Observable, of, forkJoin, from } from 'rxjs';;
import * as _ from 'lodash';
import { Router } from '@angular/router';

import { SpinnerService, ChangeOrderChoice, ChangeOrderGroup, SalesAgreementInfo, MyFavoritesPointDeclined, mergeTreeChoiceImages, getChoiceIdsHasChoiceImages } from 'phd-common';

import { CommonActionTypes, LoadError, LoadSalesAgreement, SalesAgreementLoaded } from './actions';
import { ErrorAction, ErrorFrom, SetLatestError, tryCatch } from './error.action';
import { LoadSelectedPlan } from './plan/actions';

import { TreeService } from '../core/services/tree.service';
import { OptionService } from '../core/services/option.service';
import { LotService } from '../core/services/lot.service';
import { OrganizationService } from '../core/services/organization.service';
import { JobService } from '../core/services/job.service';
import { PlanService } from '../core/services/plan.service';
import { SalesAgreementService } from '../core/services/sales-agreement.service';
import { ChangeOrderService } from '../core/services/change-order.service';
import { FavoriteService } from '../core/services/favorite.service';

import { State, showSpinner } from './reducers';
import { setTreePointsPastCutOff, mergeIntoTree } from '../shared/classes/tree.utils';
import { DesignPreviewError } from '../shared/models/error.model';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable()
export class CommonEffects
{
	loadSalesAgreement$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<LoadSalesAgreement>(CommonActionTypes.LoadSalesAgreement),
			tryCatch(source => source.pipe(
				switchMap(action =>
				{
					return forkJoin([
						this.salesAgreementService.getSalesAgreement(action.salesAgreementId),
						this.salesAgreementService.getSalesAgreementInfo(action.salesAgreementId)
					]).pipe(
						switchMap(([sag, sagInfo]) =>
						{
							return combineLatest(([
								this.jobService.loadJob(sag.jobSalesAgreementAssocs[0].jobId, sag.id),
								this.favoriteService.loadMyFavorites(sag.id)
							])).pipe(
								map(([job, fav]) => ({ job, salesAgreement: sag, salesAgreementInfo: sagInfo || new SalesAgreementInfo(), myFavorites: fav }))
							);
						}),
					);
				}),
				switchMap(result =>
				{
					const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(result.job.changeOrderGroups);
					let changeOrderChoices: ChangeOrderChoice[] = [];

					if (currentChangeOrder)
					{
						changeOrderChoices = this.changeOrderService.getJobChangeOrderChoices([currentChangeOrder]);
					}

					const favoriteChoices = _.flatMap(result.myFavorites, x => x.myFavoritesChoice);
					const favoritePointsDeclined = _.flatMap(result.myFavorites, x => x.myFavoritesPointDeclined);
					const getPointsDeclined: Observable<MyFavoritesPointDeclined[]> = favoritePointsDeclined.length > 0 ? this.treeService.getPointCatalogIds(favoritePointsDeclined) : of([]);

					return combineLatest(([
						this.orgService.getSalesCommunityByFinancialCommunityId(result.job.financialCommunityId, true),
						this.treeService.getChoiceCatalogIds([...result.job.jobChoices, ...changeOrderChoices, ...favoriteChoices]),
						getPointsDeclined
					])).pipe(
						// assign divChoiceCatalogIDs to choices for job and current change order
						map(([sc, choices, pointsDeclined]) =>
						{
							const currentChangeOrderGroup = new ChangeOrderGroup(currentChangeOrder);

							if (currentChangeOrderGroup)
							{
								_.flatMap(currentChangeOrderGroup.jobChangeOrders, co => co.jobChangeOrderChoices).forEach(ch =>
								{
									const ch1 = choices.find(c => c.dpChoiceId === ch.dpChoiceId);

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

							if (newResult.myFavorites)
							{
								_.flatMap(newResult.myFavorites, fav => fav.myFavoritesChoice).forEach(ch =>
								{
									const ch1 = choices.find(c => c.dpChoiceId === ch.dpChoiceId);

									if (ch1)
									{
										ch.divChoiceCatalogId = ch1.divChoiceCatalogId;
									}
								});

								_.flatMap(newResult.myFavorites, fav => fav.myFavoritesPointDeclined).forEach(pt =>
								{
									const ptDeclined = pointsDeclined.find(p => p.dPointId === pt.dPointId);

									if (ptDeclined)
									{
										pt.divPointCatalogId = ptDeclined.divPointCatalogId;
									}
								});
							}

							return { ...newResult, sc, currentChangeOrderGroup };
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
							selectedPlanId: result.job.planId,
							selectedLotId: result.job.lotId,
							changeOrderPlanOptions: null
						};
					}
				}),
				switchMap(result =>
				{
					if (result.selectedPlanId)
					{
						return this.changeOrderService.getTreeVersionIdByJobPlan(result.selectedPlanId).pipe(
							switchMap(treeVersionId =>
							{
								return combineLatest(([
									this.treeService.getTree(treeVersionId),
									this.treeService.getRules(treeVersionId, true),
									this.optionService.getPlanOptions(result.selectedPlanId, null, true),
									this.treeService.getOptionImages(treeVersionId, [], null, true),
									this.planService.getWebPlanMappingByPlanId(result.selectedPlanId),
									this.lotService.getLot(result.selectedLotId)
								])).pipe(
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
											salesAgreementInfo: result.salesAgreementInfo,
											myFavorites: result.myFavorites
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
					}
					else
					{
						return this.lotService.getLot(result.selectedLotId).pipe(
							map(data =>
							{
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
									myFavorites: result.myFavorites
								};
							})
						);
					}
				}),
				switchMap(result =>
				{
					//get all choice images with hasImage flag true
					const choiceIds = getChoiceIdsHasChoiceImages(result.tree, true);
					return this.treeService.getChoiceImageAssoc(choiceIds).pipe(
						map(data =>
						{
							return {
								...result,
								choiceImages: data
							};
						})
					);
				}),
				switchMap(result =>
				{
					//map choice level images
					mergeTreeChoiceImages(result.choiceImages, result.tree);

					//make sure base price is locked in.
					const baseHouseOption = result.job.jobPlanOptions.find(o => o.jobOptionTypeName === 'BaseHouse');
					let selectedPlanPrice: number = 0;

					if (['OutforSignature', 'Signed', 'Approved'].indexOf(result.salesAgreement.status) !== -1)
					{
						if (baseHouseOption)
						{
							selectedPlanPrice = baseHouseOption.listPrice;
						}

						if (result.changeOrder && result.changeOrder.salesStatusDescription !== 'Pending')
						{
							const co = result.changeOrder.jobChangeOrders.find(co => co.jobChangeOrderPlanOptions && co.jobChangeOrderPlanOptions.some(po => po.integrationKey === '00001' && po.action === 'Add'));

							if (co)
							{
								selectedPlanPrice = co.jobChangeOrderPlanOptions.find(po => po.action === 'Add' && po.integrationKey === '00001').listPrice;
							}
						}
					}

					return <Observable<Action>>from([
						new SalesAgreementLoaded(result.salesAgreement, result.salesAgreementInfo, result.job, result.sc, result.selectedChoices, result.selectedPlanId, result.selectedHanding, result.tree, result.rules, result.options, result.images, result.mappings, result.changeOrder, result.lot, result.myFavorites),
						new LoadSelectedPlan(result.selectedPlanId, selectedPlanPrice)
					]);
				})
			), LoadError, 'Error loading sales agreement!!', ErrorFrom.LoadSalesAgreement)
		);
	});

	showLoadingSpinner$: Observable<{
		prev: boolean;
		current: boolean;
	}> = createEffect(
			() => this.actions$.pipe(
				withLatestFrom(this.store.pipe(select(showSpinner))),
				map(([action, showSpinner]) =>
				{
					return showSpinner;
				}),
				scan((prev, current) => ({ prev: prev.current, current: current }), { prev: false, current: false }),
				tap((showSpinnerScan: { prev: boolean; current: boolean; }) =>
				{
					if (showSpinnerScan.prev !== showSpinnerScan.current)
					{
						this.spinnerService.showSpinner(showSpinnerScan.current);
					}
				})),
			{ dispatch: false }
		);

	hasError$: Observable<Action> = createEffect(
		() => this.actions$.pipe(
			scan((prev, action) =>
				({
					prev: prev.action,
					action: action instanceof (ErrorAction),
					err: action
				}),
			{ prev: false, action: false, err: <ErrorAction>null }
			),
			filter((errorScan: { prev: boolean; action: boolean; err: Action; }) => !errorScan.prev && errorScan.action),
			map((errorScan: { prev: boolean; action: boolean; err: Action; }) =>
			{
				this.router.navigate(['error']);

				if (errorScan.err)
				{
					const errStack = (<ErrorAction>errorScan.err).error ?
						((<ErrorAction>errorScan.err).error.stack ? (<ErrorAction>errorScan.err).error.stack : JSON.stringify((<ErrorAction>errorScan.err).error))
						: '';
					const errMsg = (<ErrorAction>errorScan.err).friendlyMessage ? (<ErrorAction>errorScan.err).friendlyMessage : '';
					const errFrom = (<ErrorAction>errorScan.err).errFrom ? (<ErrorAction>errorScan.err).errFrom : '';

					return new SetLatestError(new DesignPreviewError(errFrom, errStack, errMsg));
				}
			})
		)
	);

	constructor(
		private actions$: Actions,
		private store: Store<State>,
		private treeService: TreeService,
		private optionService: OptionService,
		private lotService: LotService,
		private orgService: OrganizationService,
		private jobService: JobService,
		private planService: PlanService,
		private salesAgreementService: SalesAgreementService,
		private changeOrderService: ChangeOrderService,
		private favoriteService: FavoriteService,
		private spinnerService: SpinnerService,
		private router: Router) { }
}
