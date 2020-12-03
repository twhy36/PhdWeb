import { Injectable } from '@angular/core';

import { Action, Store, select } from '@ngrx/store';
import { Effect, Actions, ofType } from '@ngrx/effects';
import { switchMap, combineLatest, map, scan, withLatestFrom, tap } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';
import { from } from 'rxjs/observable/from';
import * as _ from 'lodash';

import { CommonActionTypes, LoadError, LoadSalesAgreement, SalesAgreementLoaded } from './actions';
import { tryCatch } from './error.action';
import { LoadSelectedPlan } from './plan/actions';
import { LoadLots } from './lot/actions';

import { TreeService } from '../core/services/tree.service';
import { OptionService } from '../core/services/option.service';
import { LotService } from '../core/services/lot.service';
import { OrganizationService } from '../core/services/organization.service';
import { JobService } from '../core/services/job.service';
import { PlanService } from '../core/services/plan.service';
import { SalesAgreementService } from '../core/services/sales-agreement.service';
import { ChangeOrderService } from '../core/services/change-order.service';
import { SpinnerService } from 'phd-common/services/spinner.service';

import { State, showSpinner } from './reducers';
import { setTreePointsPastCutOff, mergeIntoTree } from '../shared/classes/tree.utils';
import { ChangeOrderChoice, ChangeOrderGroup } from '../shared/models/job-change-order.model';


@Injectable()
export class CommonEffects
{
	@Effect()
	loadSalesAgreement$: Observable<Action> = this.actions$.pipe(
		ofType<LoadSalesAgreement>(CommonActionTypes.LoadSalesAgreement),
		tryCatch(source => source.pipe(
			switchMap(action =>
			{
				return this.salesAgreementService.getSalesAgreement(action.salesAgreementId).pipe(
					switchMap(sag =>
					{
						return this.jobService.loadJob(sag.jobSalesAgreementAssocs[0].jobId).pipe(
							map(job =>
							{
								return { job, salesAgreement: sag };
							})
						);
					})
				);
			}),
			switchMap(result =>
			{
				const currentChangeOrder = this.changeOrderService.getCurrentChangeOrder(result.job.changeOrderGroups);
				let changeOrderChoices: ChangeOrderChoice[] = [];

				if (currentChangeOrder)
				{
					changeOrderChoices = this.changeOrderService.getJobChangeOrderChoices([currentChangeOrder])
				}

				return this.orgService.getSalesCommunityByFinancialCommunityId(result.job.financialCommunityId, true).pipe(
					combineLatest(
						this.treeService.getChoiceCatalogIds([...result.job.jobChoices, ...changeOrderChoices])
					),
					//assign divChoiceCatalogIDs to choices for job and current change order
					map(([sc, choices]) =>
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
										salesAgreement: result.salesAgreement
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
								salesAgreement: result.salesAgreement
							}
						})
					)
				}
			}),
			switchMap(result =>
			{
				return <Observable<Action>>from([
					new SalesAgreementLoaded(result.salesAgreement, result.job, result.sc, result.selectedChoices, result.selectedPlanId, result.selectedHanding, result.tree, result.rules, result.options, result.images, result.mappings, result.changeOrder, result.lot),
					new LoadLots(result.sc.id),
					new LoadSelectedPlan(result.selectedPlanId)
				]);

			})
		), LoadError, "Error loading sales agreement!!")
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
		private treeService: TreeService,
		private optionService: OptionService,
		private lotService: LotService,
		private orgService: OrganizationService,
		private jobService: JobService,
		private planService: PlanService,
		private salesAgreementService: SalesAgreementService,
		private changeOrderService: ChangeOrderService,
		private spinnerService: SpinnerService) { }
}
