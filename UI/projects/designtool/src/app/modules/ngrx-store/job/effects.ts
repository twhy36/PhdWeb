import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { switchMap, withLatestFrom, exhaustMap, map, take, scan, skipWhile } from 'rxjs/operators';
import { NEVER, Observable, of, from, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ESignEnvelope, ESignStatusEnum, ESignTypeEnum, Job } from 'phd-common';

import { JobActionTypes, CreateChangeOrderEnvelope, EnvelopeError, LoadSpecs, SpecsLoaded, LoadJobForJob, JobLoadedByJobId, LoadPulteInfo, PulteInfoLoaded, SavePulteInfo, PulteInfoSaved, JobPlanOptionsUpdated } from './actions';
import { ContractService } from '../../core/services/contract.service';
import { ChangeOrderService } from '../../core/services/change-order.service';

import { tryCatch } from '../error.action';

import * as fromRoot from '../reducers';
import * as _ from "lodash";
import { JobService } from '../../core/services/job.service';
import { LoadError, LoadSpec, ChangeOrderEnvelopeCreated, SalesAgreementLoaded, ScenarioLoaded, CommonActionTypes, JobLoaded } from '../actions';
import { SetPermissions, UserActionTypes } from '../user/actions';
import { SnapShotData } from '../../shared/models/envelope-info.model';

@Injectable()
export class JobEffects
{
	constructor(private actions$: Actions,
		private store: Store<fromRoot.State>,
		private contractService: ContractService,
		private jobService: JobService,
		private toastr: ToastrService,
		private changeOrderService: ChangeOrderService) { }

	loadSpecs$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<LoadSpecs>(JobActionTypes.LoadSpecs),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([, store]) => {
					let lotIDs = store.lot.lots.filter(x => x.lotBuildTypeDesc === 'Spec' && x.lotStatusDescription === 'Available')
						.map(l => l.id);

					return (lotIDs.length > 0) ? this.jobService.getSpecJobs(lotIDs) : of([]);
				}),
				map(jobs => jobs.filter(job => this.showOnQuickMovin(job))),
				map(jobs => new SpecsLoaded(jobs))
			), LoadError, "Unable to load specs")
		);
	});

	createChangeOrderEnvelope$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<CreateChangeOrderEnvelope>(JobActionTypes.CreateChangeOrderEnvelope),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				map(([action, store]) => {
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
				exhaustMap((data) => {
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
						map(envelopeId => {
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
				map(() =>
				{
					this.toastr.success('Spec Info Saved');

					return new PulteInfoSaved();
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

	private showOnQuickMovin = (job: Job) =>
	{
		// assumes there will always be a JIO
		const jio = job.changeOrderGroups
			.filter(co => co.jobChangeOrderGroupDescription === 'JIO' || co.jobChangeOrderGroupDescription === 'Pulte Home Designer Generated Job Initiation Change Order')
			.sort((a, b) => {
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
				}), {sagScenarioLoaded: false, userPermissions: false, action: <SalesAgreementLoaded | ScenarioLoaded>null}),
			skipWhile(result => !result.sagScenarioLoaded || !result.userPermissions),
			map(result => result.action),
			switchMap(action => 
				this.store.pipe(
					take(1),
					switchMap(state => {
						if (!state.user.canSell) {
							return NEVER;
						}
						if (state.job.jobTypeName !== 'Spec' && state.job.jobTypeName !== 'Model') {
							return NEVER;
						}
						if (action instanceof SalesAgreementLoaded && action.salesAgreement.status !== 'Pending') {
							return NEVER;
						}
						
						if (state.job && state.scenario?.options && state.job.jobPlanOptions.some(jpo => state.scenario.options.find(o => o.id === jpo.planOptionId && o.listPrice !== jpo.listPrice))) {
							return this.jobService.updateSpecJobPricing(state.job.lotId);
						}
						
						return NEVER;
					})

				)
			),
			map(jobPlanOptions => new JobPlanOptionsUpdated(jobPlanOptions))
		)
	);
}
