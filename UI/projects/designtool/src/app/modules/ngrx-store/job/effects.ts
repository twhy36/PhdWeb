import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { switchMap, combineLatest, withLatestFrom, exhaustMap, map, take } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { from } from 'rxjs/observable/from';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { ToastrService } from 'ngx-toastr';

import { JobActionTypes, CreateChangeOrderEnvelope, EnvelopeError, LoadSpecs, SpecsLoaded, LoadJobForJob, JobLoadedByJobId, LoadPulteInfo, PulteInfoLoaded, SavePulteInfo, PulteInfoSaved } from './actions';
import { convertMapToMergeFieldDto } from '../../shared/classes/merge-field-utils.class';
import { ContractService } from '../../core/services/contract.service';
import { ChangeOrderService } from '../../core/services/change-order.service';

import { tryCatch } from '../error.action';

import * as fromRoot from '../reducers';
import * as _ from "lodash";
import { JobService } from '../../core/services/job.service';
import { LoadError, LoadSpec, ChangeOrderEnvelopeCreated } from '../actions';
import { Job } from '../../shared/models/job.model';
import { ESignEnvelope, ESignStatusEnum, ESignTypeEnum } from '../../shared/models/esign-envelope.model';
import { MergeFieldData } from '../../shared/models/contract.model';

@Injectable()
export class JobEffects
{
	constructor(private actions$: Actions,
		private store: Store<fromRoot.State>,
		private contractService: ContractService,
		private jobService: JobService,
		private toastr: ToastrService,
		private changeOrderService: ChangeOrderService) { }

	@Effect()
	loadSpecs$: Observable<Action> = this.actions$.pipe(
		ofType<LoadSpecs>(JobActionTypes.LoadSpecs),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([, store]) =>
			{
				let lotIDs = store.lot.lots.filter(x => x.lotBuildTypeDesc === 'Spec' && x.lotStatusDescription === 'Available')
					.map(l => l.id);

				return (lotIDs.length > 0) ? this.jobService.getSpecJobs(lotIDs) : of([]);
			}),
			map(jobs => jobs.filter(job => this.showOnQuickMovin(job))),
			map(jobs => new SpecsLoaded(jobs))
		), LoadError, "Unable to load specs")
	);

	@Effect()
	createChangeOrderEnvelope$: Observable<Action> = this.actions$.pipe(
		ofType<CreateChangeOrderEnvelope>(JobActionTypes.CreateChangeOrderEnvelope),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const salesAgreementStatus = store.salesAgreement.status;
				const marketId = store.org.salesCommunity.market.id;
				const financialCommunityId = store.job.financialCommunityId;
				const envelopeId = action.changeOrder.envelopeId;

				const mergeFieldData = salesAgreementStatus != 'Pending' ? this.contractService.getLockedMergeFields(store.job.id) : of(new MergeFieldData());
				const customMergeFields = salesAgreementStatus == 'Pending' ? this.contractService.getCustomMergeFields(marketId, financialCommunityId) : of<Map<string, string>>(null);
				const systemMergeFields = salesAgreementStatus == 'Pending' ? this.store.pipe(select(fromRoot.systemMergeFields)) : of<Map<string, string>>(null);

				return customMergeFields.pipe(
					combineLatest(mergeFieldData, systemMergeFields),
					map(([customMergeFields, mergeFieldData, systemMergeFields]) => {
						return {
							customMergeFields, mergeFieldData, systemMergeFields, jioSelections: action.changeOrder.jioSelections, templates: action.changeOrder.templates, financialCommunityId: financialCommunityId, salesAgreement: store.salesAgreement,
							changeOrder: action.changeOrder, envelopeInfo: action.changeOrder.envelopeInfo, jobId: store.job.id, changeOrderGroupId: action.changeOrder.changeOrderGroupId,
							envelopId: envelopeId, constructionChangeOrderSelectionsDto: action.changeOrder.constructionChangeOrderSelections,
							salesChangeOrderSelections: action.changeOrder.salesChangeOrderSelections, planChangeOrderSelectionsDto: action.changeOrder.planChangeOrderSelections, nonStandardOptionSelectionsDto: action.changeOrder.nonStandardChangeOrderSelections,
							lotTransferSeletionsDto: action.changeOrder.lotTransferChangeOrderSelections, changeOrderInformation: action.changeOrder.changeOrderInformation };
					}),
					take(1)
				);
			}),
			exhaustMap((data) =>
			{
				const convertedCustomMergeFields = data.mergeFieldData && data.mergeFieldData.customMergeFields ? data.mergeFieldData.customMergeFields : data.customMergeFields ? convertMapToMergeFieldDto(data.customMergeFields) : [];
				const convertedSystemMergeFields = data.mergeFieldData && data.mergeFieldData.systemMergeFields ? data.mergeFieldData.systemMergeFields : data.systemMergeFields ? convertMapToMergeFieldDto(data.systemMergeFields) : [];

				return this.contractService.saveSnapshot(data.changeOrder, data.jobId, data.changeOrderGroupId).pipe(
					switchMap(() =>
						this.contractService.createEnvelope([...convertedCustomMergeFields, ...convertedSystemMergeFields], data.jioSelections, data.templates, data.financialCommunityId, data.salesAgreement.salesAgreementNumber, data.salesAgreement.status, data.envelopeInfo, data.jobId, data.changeOrderGroupId, data.constructionChangeOrderSelectionsDto, data.salesChangeOrderSelections, data.planChangeOrderSelectionsDto, data.nonStandardOptionSelectionsDto, data.lotTransferSeletionsDto, data.changeOrderInformation)),
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
		), EnvelopeError, "Error creating envelope!")
	);

	@Effect()
	loadJobForJob$: Observable<Action> = this.actions$.pipe(
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
	);

	@Effect()
	loadPulteInfo$: Observable<Action> = this.actions$.pipe(
		ofType<LoadPulteInfo>(JobActionTypes.LoadPulteInfo),
		tryCatch(source => source.pipe(
			switchMap(action =>
			{
				const jobId = action.jobId;

				return this.jobService.getPulteInfoByJobId(jobId);
			}),
			map(pulteInfo => new PulteInfoLoaded(pulteInfo))
		), LoadError, 'Unable to load Pulte Info for this job')
	);

	@Effect()
	savePulteInfo$: Observable<Action> = this.actions$.pipe(
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
	);

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
}
