import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { switchMap, withLatestFrom, exhaustMap, map, take, scan, skipWhile } from 'rxjs/operators';
import { NEVER, Observable, of, from, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ESignEnvelope, ESignStatusEnum, ESignTypeEnum, FeatureSwitchService, IFeatureSwitchOrgAssoc, Job, TimeOfSaleOptionPrice, Constants } from 'phd-common';

import { JobActionTypes, CreateChangeOrderEnvelope, EnvelopeError, LoadSpecs, SpecsLoaded, LoadJobForJob, JobLoadedByJobId, LoadPulteInfo, PulteInfoLoaded, SavePulteInfo, PulteInfoSaved, JobPlanOptionsUpdated, SaveReplaceOptionPrice, ReplaceOptionPriceSaved, DeleteReplaceOptionPrice, ReplaceOptionPriceDeleted, SaveError, UpdateReplaceOptionPrice, ReplaceOptionPriceUpdated } from './actions';
import { ContractService } from '../../core/services/contract.service';
import { ChangeOrderService } from '../../core/services/change-order.service';

import { tryCatch } from '../error.action';

import * as fromRoot from '../reducers';
import * as _ from "lodash";
import { JobService } from '../../core/services/job.service';
import { LiteService } from '../../core/services/lite.service';
import { LoadError, LoadSpec, ChangeOrderEnvelopeCreated, SalesAgreementLoaded, ScenarioLoaded, CommonActionTypes, JobLoaded } from '../actions';
import { SetPermissions, UserActionTypes } from '../user/actions';
import { SnapShotData } from '../../shared/models/envelope-info.model';
import { SetIsPhdLiteByFinancialCommunity } from '../lite/actions';
import { CreateJobChangeOrders, CreatePlanChangeOrder } from '../change-order/actions';


@Injectable()
export class JobEffects
{
	constructor(private actions$: Actions,
		private store: Store<fromRoot.State>,
		private contractService: ContractService,
		private jobService: JobService,
		private toastr: ToastrService,
		private changeOrderService: ChangeOrderService,
		private _featureSwitchService: FeatureSwitchService,
		private liteService: LiteService) { }

	loadSpecs$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<LoadSpecs>(JobActionTypes.LoadSpecs),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([, store]) =>
				{
					let lotIDs = store.lot.lots?.filter(x => x.lotBuildTypeDesc === 'Spec' && x.lotStatusDescription === 'Available')
						.map(l => l.id);

					return (lotIDs?.length > 0) ? this.jobService.getSpecJobs(lotIDs) : of([]);
				}),
				switchMap(jobs =>
				{
					const fcIds = jobs.map(job => job.financialCommunityId);

					return this._featureSwitchService.getFeatureSwitchForCommunities('Phd Lite', fcIds).pipe(
						map(associations => ({ jobs, associations }))
					);
				}),
				switchMap(result => from([new SpecsLoaded(result.jobs.filter(job => this.showOnQuickMovin(job, result.associations))), new SetIsPhdLiteByFinancialCommunity(result.associations)]))
			), LoadError, "Unable to load specs")
		);
	});

	createChangeOrderEnvelope$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<CreateChangeOrderEnvelope>(JobActionTypes.CreateChangeOrderEnvelope),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				map(([action, store]) =>
				{
					const financialCommunityId = store.job.financialCommunityId;
					const envelopeId = action.changeOrder.envelopeId;

					return {
						jioSelections: action.changeOrder.jioSelections, templates: action.changeOrder.templates, financialCommunityId: financialCommunityId, salesAgreement: store.salesAgreement,
						changeOrder: action.changeOrder, envelopeInfo: action.changeOrder.envelopeInfo, jobId: store.job.id, changeOrderGroupId: action.changeOrder.changeOrderGroupId,
						envelopId: envelopeId, constructionChangeOrderSelectionsDto: action.changeOrder.constructionChangeOrderSelections,
						salesChangeOrderSelections: action.changeOrder.salesChangeOrderSelections, planChangeOrderSelectionsDto: action.changeOrder.planChangeOrderSelections, nonStandardOptionSelectionsDto: action.changeOrder.nonStandardChangeOrderSelections,
						lotTransferSeletionsDto: action.changeOrder.lotTransferChangeOrderSelections, changeOrderInformation: action.changeOrder.changeOrderInformation, idPhdLite: store.lite.isPhdLite
					};
				}),
				exhaustMap((data) =>
				{
					const snapShotData: SnapShotData = {
						jioSelections: data.jioSelections,
						templates: data.templates,
						financialCommunityId: data.financialCommunityId,
						salesAgreementNumber: data.salesAgreement.salesAgreementNumber,
						salesAgreementStatus: data.salesAgreement.status,
						envelopeInfo: data.envelopeInfo,
						jobId: data.jobId,
						changeOrderGroupId: data.changeOrderGroupId,
						constructionChangeOrderSelections: data.constructionChangeOrderSelectionsDto,
						changeOrderInformation: data.changeOrderInformation,
						salesChangeOrderSelections: data.salesChangeOrderSelections,
						planChangeOrderSelections: data.planChangeOrderSelectionsDto,
						nonStandardChangeOrderSelections: data.nonStandardOptionSelectionsDto,
						lotTransferChangeOrderSelections: data.lotTransferSeletionsDto
					};
					return this.contractService.saveSnapshot(data.changeOrder, data.jobId, data.changeOrderGroupId).pipe(
						switchMap(() =>
							this.contractService.createEnvelope(snapShotData, null, data.idPhdLite)),
						map(envelopeId =>
						{
							return { envelopeId, changeOrder: data.changeOrder };
						}
						));
				}),
				switchMap(data =>
				{
					let eSignEnvelope: ESignEnvelope = {
						envelopeGuid: data.envelopeId,
						eSignStatusId: ESignStatusEnum.Created,
						eSignTypeId: ESignTypeEnum.ChangeOrder,
						edhChangeOrderGroupId: data.changeOrder.changeOrderGroupId
					};

					return forkJoin(of(data.changeOrder), this.changeOrderService.createESignEnvelope(eSignEnvelope));
				}),
				switchMap(([changeOrder, eSignEnvelope]) => of(new ChangeOrderEnvelopeCreated(changeOrder, eSignEnvelope)))
			), EnvelopeError, this.getErrorMessage)
		)
	);

	loadJobForJob$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<LoadJobForJob>(JobActionTypes.LoadJobForJob),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const jobId = action.jobId;

					return this.jobService.loadJob(jobId);
				}),
				switchMap((jobs, store) =>
				{
					return from([new JobLoadedByJobId(jobs),

					new LoadSpec(jobs)]
					);
				})
			), LoadError, 'Unable to load job for this lot')
		)
	);

	loadPulteInfo$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<LoadPulteInfo>(JobActionTypes.LoadPulteInfo),
			tryCatch(source => source.pipe(
				switchMap(action =>
				{
					const jobId = action.jobId;

					return this.jobService.getPulteInfoByJobId(jobId);
				}),
				map(pulteInfo => new PulteInfoLoaded(pulteInfo))
			), LoadError, 'Unable to load Pulte Info for this job')
		)
	);

	savePulteInfo$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<SavePulteInfo>(JobActionTypes.SavePulteInfo),
			tryCatch(source => source.pipe(
				switchMap(action =>
				{
					return this.jobService.savePulteInfo(action.pulteInfo);
				}),
				map(pulteInfo =>
				{
					this.toastr.success('Spec Info Saved');

					return new PulteInfoSaved(pulteInfo);
				})
			), LoadError, 'Unable to save Spec Info')
		)
	);


	private getErrorMessage(error: any): string
	{
		if (error.status === 400 && error.error?.templateName)
		{
			return 'Following templates have not been uploaded : ' + error.error.templateName.join(', ');
		}
		else
		{
			return 'Error creating envelope!';
		}
	}

	private showOnQuickMovin(job: Job, assoc: IFeatureSwitchOrgAssoc[])
	{
		const isPhdLite = !!assoc.find(a => a.org.edhFinancialCommunityId === job.financialCommunityId && a.state === true);

		if (isPhdLite)
		{
			return true;
		}

		// assumes there will always be a JIO
		const jio = job.changeOrderGroups
			.filter(co => co.jobChangeOrderGroupDescription === 'JIO' || co.jobChangeOrderGroupDescription === 'Pulte Home Designer Generated Job Initiation Change Order')
			.sort((a, b) =>
			{
				return new Date(b.createdUtcDate).getTime() - new Date(a.createdUtcDate).getTime();
			})[0];

		return jio ? jio.constructionStatusDescription === 'Approved' : false;
	}

	updateSpecJobPricing$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<SalesAgreementLoaded | ScenarioLoaded | JobLoaded | SetPermissions>(CommonActionTypes.SalesAgreementLoaded, CommonActionTypes.ScenarioLoaded, CommonActionTypes.JobLoaded, UserActionTypes.SetPermissions),
			scan((prev, action) => (
				{
					sagScenarioLoaded: prev.sagScenarioLoaded || action instanceof SalesAgreementLoaded || action instanceof ScenarioLoaded || action instanceof JobLoaded,
					userPermissions: prev.userPermissions || action instanceof SetPermissions,
					action: action instanceof SalesAgreementLoaded || action instanceof ScenarioLoaded || action instanceof JobLoaded ? action : prev.action
				}), { sagScenarioLoaded: false, userPermissions: false, action: <SalesAgreementLoaded | ScenarioLoaded | JobLoaded>null }),
			skipWhile(result => !result.sagScenarioLoaded || !result.userPermissions),
			map(result => result.action),
			switchMap(action =>
				this.store.pipe(
					take(1),
					switchMap(state =>
					{
						if (!state.user.canSell)
						{
							return NEVER;
						}

						if (state.job.jobTypeName !== 'Spec' && state.job.jobTypeName !== 'Model')
						{
							return NEVER;
						}

						if (action instanceof SalesAgreementLoaded && action.salesAgreement.status !== Constants.AGREEMENT_STATUS_PENDING)
						{
							return NEVER;
						}

						const currentChangeOrderGroup = state.job?.changeOrderGroups?.length > 0 ? state.job.changeOrderGroups[0] : null;
						const isPhdLite = this.liteService.checkLiteAgreement(state.job, currentChangeOrderGroup);
						if (isPhdLite)
						{
							// Spec price update will be handled by updateSpecJobPricingLite$() in lite effects.
							return NEVER;
						}

						let shouldUpdateSpecChangeOrder = false;
						
						// Make sure the latest change order is valid before checking against the construction status.
						// Should NOT use simplified version currentChangeOrderGroup?.constructionStatusDescription !== Constants.AGREEMENT_STATUS_APPROVED
						// because it will satisfy the condition if currentChangeOrderGroup is null which is not expected.
						if (currentChangeOrderGroup && currentChangeOrderGroup.constructionStatusDescription !== Constants.AGREEMENT_STATUS_APPROVED)
						{
							const changeOrderPlanOptions = currentChangeOrderGroup.jobChangeOrders.flatMap(co => co.jobChangeOrderPlanOptions);

							shouldUpdateSpecChangeOrder = changeOrderPlanOptions.some(copo => state.scenario.options.find(o => o.id === copo.planOptionId && o.listPrice !== copo.listPrice));
						}

						const updateSpecJobPricing = state.job && state.scenario?.options && state.job.jobPlanOptions.some(jpo => state.scenario.options.find(o => o.id === jpo.planOptionId && o.listPrice !== jpo.listPrice)) 
							? this.jobService.updateSpecJobPricing(state.job.lotId) 
							: of(null);
						
						return updateSpecJobPricing.pipe
						(
							map(jobPlanOptions => 
							{
								return { jobPlanOptions: jobPlanOptions, shouldUpdateSpecChangeOrder: shouldUpdateSpecChangeOrder, changeOrderGroup: currentChangeOrderGroup };
							})
						);
					})

				)
			),
			switchMap(result => 
			{
				let actions = [];
				if (result.jobPlanOptions)
				{
					actions.push(new JobPlanOptionsUpdated(result.jobPlanOptions));
				}

				if (result.shouldUpdateSpecChangeOrder)
				{
					const specChangeOrders = result.changeOrderGroup.jobChangeOrders;

					if (specChangeOrders.some(co => co.jobChangeOrderTypeDescription === 'Plan'))
					{
						actions.push(new CreatePlanChangeOrder());
					}
					else if (specChangeOrders.some(co => co.jobChangeOrderTypeDescription === 'ChoiceAttribute' || co.jobChangeOrderTypeDescription === 'Elevation'))
					{
						actions.push(new CreateJobChangeOrders());
					}
				}

				if (actions.length > 0)
				{
					return from(actions);
				}

				return NEVER;
			})
		)
	);

	saveReplaceOptionPrices$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SaveReplaceOptionPrice>(JobActionTypes.SaveReplaceOptionPrice),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const timeOfSaleOptionPrices = (action as SaveReplaceOptionPrice).timeOfSaleOptionPrices;

					if (timeOfSaleOptionPrices && timeOfSaleOptionPrices.length)
					{
						return this.jobService.saveTimeOfSaleOptionPrices(timeOfSaleOptionPrices);
					}
					else
					{
						return of([] as TimeOfSaleOptionPrice[]);
					}
				}),
				map(timeOfSaleOptionPrices => new ReplaceOptionPriceSaved(timeOfSaleOptionPrices))
			), SaveError, 'Error saving replaced option prices!!')
		);
	});

	deleteReplaceOptionPrices$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<DeleteReplaceOptionPrice>(JobActionTypes.DeleteReplaceOptionPrice),
			tryCatch(source => source.pipe(
				switchMap(action =>
					this.store.pipe(
						take(1),
						switchMap(state =>
						{
							const timeOfSaleOptionPrices = state.job.timeOfSaleOptionPrices;

							if (timeOfSaleOptionPrices && timeOfSaleOptionPrices.length)
							{
								return this.jobService.deleteTimeOfSaleOptionPrices(timeOfSaleOptionPrices, (action as DeleteReplaceOptionPrice).isRevertChangeOrder);
							}
							else
							{
								return of([] as TimeOfSaleOptionPrice[]);
							}
						})
					)),
				map(timeOfSaleOptionPrices => new ReplaceOptionPriceDeleted(timeOfSaleOptionPrices))
			), SaveError, 'Error deleting replaced option prices!!')
		);
	});

	updateReplaceOptionPrices$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<UpdateReplaceOptionPrice>(JobActionTypes.UpdateReplaceOptionPrice),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const timeOfSaleOptionPrices = (action as UpdateReplaceOptionPrice).timeOfSaleOptionPrices;

					if (timeOfSaleOptionPrices && timeOfSaleOptionPrices.length)
					{
						return this.jobService.updateTimeOfSaleOptionPrices(timeOfSaleOptionPrices);
					}
					else
					{
						return of([] as TimeOfSaleOptionPrice[]);
					}
				}),
				map(timeOfSaleOptionPrices => new ReplaceOptionPriceUpdated(timeOfSaleOptionPrices))
			), SaveError, 'Error updating replaced option prices!!')
		);
	});
}
