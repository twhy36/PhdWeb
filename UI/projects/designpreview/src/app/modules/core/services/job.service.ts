import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import * as _ from 'lodash';

import { withSpinner, Job, IJob, ChangeOrderGroup, FloorPlanImage, newGuid, createBatchGet, IdentityService, createBatchHeaders, createBatchBody, JobPlanOption, ChangeOrder } from 'phd-common';

import { environment } from '../../../../environments/environment';

@Injectable()
export class JobService
{
	private _ds = encodeURIComponent('$');

	constructor(private _http: HttpClient, private identityService: IdentityService) { }

	loadJob(jobId: number, salesAgreementId?: number): Observable<Job>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				const guid = newGuid();
				let requestBundles: string[] = [];
				let newRequest = (filter: string, select: string, expand: string) =>
				{
					let batch = `${environment.apiUrl}jobs?${this._ds}filter=${filter}&${this._ds}select=${select}&${this._ds}expand=${expand}`;

					requestBundles.push(batch);
				};

				const filter = `id eq ${jobId}`;
				const select = 'id,financialCommunityId,constructionStageName,lotId,planId,handing,startDate';

				// select
				const lotSelect = 'id,lotBlock,premium,lotStatusDescription,streetAddress1,streetAddress2,city,stateProvince,postalCode,foundationType,lotBuildTypeDesc,unitNumber,salesBldgNbr,alternateLotBlock,constructionPhaseNbr,county';
				const jobChoicesSelect = 'id,dpChoiceId,dpChoiceQuantity,dpChoiceCalculatedPrice,choiceLabel';
				const jobChoiceAttributesSelect = 'id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel';
				const jobChoiceLocationsSelect = 'id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel';
				const jobChoiceLocationAttributesSelect = 'id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku';
				const jobPlanOptionsSelect = 'id,planOptionId,listPrice,optionSalesName,optionDescription,optionQty,jobOptionTypeName';
				const jobPlanOptionAttributesSelect = 'id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel';
				const jobPlanOptionLocationsSelect = 'id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel';
				const jobPlanOptionLocationAttributesSelect = 'id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku';
				const planOptionCommunitySelect = 'id';
				const optionCommunitySelect = 'id';
				const optionSelect = 'financialOptionIntegrationKey';
				const jobNonStandardOptionsSelect = 'id,name,description,financialOptionNumber,quantity,unitPrice';
				const pendingConstructionStagesSelect = 'id,constructionStageName, constructionStageStartDate';
				const jobConstructionStageHistoriesSelect = 'id,constructionStageId,constructionStageStartDate';

				// expands
				let expand = 'jobSalesAgreementAssocs($filter=isActive eq true)';
				expand += `,lot($select=${lotSelect})`;
				expand += `,jobNonStandardOptions($select=${jobNonStandardOptionsSelect})`;
				expand += `,pendingConstructionStages($select=${pendingConstructionStagesSelect})`;
				expand += `,jobConstructionStageHistories($select=${jobConstructionStageHistoriesSelect})`;

				// batch requests
				newRequest(filter, select, expand);
				newRequest(filter, 'id', `jobPlanOptions($select=${jobPlanOptionsSelect};$expand=jobPlanOptionAttributes($select=id),jobPlanOptionLocations($select=id;$expand=jobPlanOptionLocationAttributes($select=id)),planOptionCommunity($select=${planOptionCommunitySelect};$expand=optionCommunity($select=${optionCommunitySelect};$expand=option($select=${optionSelect}))))`);
				newRequest(filter, 'id', `jobPlanOptions($select=id;$expand=jobPlanOptionAttributes($select=${jobPlanOptionAttributesSelect}))`);
				newRequest(filter, 'id', `jobPlanOptions($select=id;$expand=jobPlanOptionLocations($select=${jobPlanOptionLocationsSelect};$expand=jobPlanOptionLocationAttributes($select=${jobPlanOptionLocationAttributesSelect})))`);
				newRequest(filter, 'id', `jobChoices($select=${jobChoicesSelect};$expand=jobChoiceAttributes($select=id),jobChoiceLocations($select=id;$expand=jobChoiceLocationAttributes($select=id)),jobChoiceJobPlanOptionAssocs($select=id))`); //, jobChoiceId, jobPlanOptionId, choiceEnabledOptio
				newRequest(filter, 'id', `jobChoices($select=id;$filter=jobChoiceAttributes/any();$expand=jobChoiceAttributes($select=${jobChoiceAttributesSelect}))`);
				newRequest(filter, 'id', `jobChoices($select=id;$expand=jobChoiceLocations($select=${jobChoiceLocationsSelect};$expand=jobChoiceLocationAttributes($select=${jobChoiceLocationAttributesSelect})))`);
				newRequest(filter, 'id', `jobChoices($select=id;$expand=jobChoiceJobPlanOptionAssocs)`);

				const batchRequests = requestBundles.map(req => createBatchGet(req));

				const headers = createBatchHeaders(guid, token);
				const batch = createBatchBody(guid, batchRequests);

				return withSpinner(this._http).post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				const bodies: any[] = response.responses.map(r => r.body);
				let data = _.flatten(bodies.map(body =>
				{
					return body.value?.length > 0 ? body.value : null;
				}).filter(res => res)) as IJob[];

				if (data.length === 0) {
					throw new Error(`Job ${jobId} was not found.`);
				}

				// find the main job record
				let iJob = data.find(j => j.financialCommunityId);

				// find the job choices attribute and location records
				const jobWithChoices = data.filter(x => x.jobChoices && !x.financialCommunityId);
				iJob.jobChoices = jobWithChoices.find(x => x.jobChoices.every(c => c.dpChoiceId))?.jobChoices;
				const jobChoicesWithAttributes = jobWithChoices.find(x => x.jobChoices.every(c => c.jobChoiceAttributes && c.jobChoiceAttributes.every(jal => jal.attributeCommunityId)))?.jobChoices;
				const jobChoicesWithLocations = jobWithChoices.find(x => x.jobChoices.every(c => c.jobChoiceLocations && c.jobChoiceLocations.every(jcl => jcl.locationCommunityId)))?.jobChoices;
				const jobChoiceWithJobPlanOptionsAssocs = jobWithChoices.find(x => x.jobChoices.every(c => c.jobChoiceJobPlanOptionAssocs && c.jobChoiceJobPlanOptionAssocs.every(jpoa => jpoa.jobPlanOptionId)))?.jobChoices;

				iJob.jobChoices.map(jobChoice =>
				{
					// get matching location/attributes/planOptionAssocs for the current jobChoice
					const attributes = _.flatMap(jobChoicesWithAttributes.filter(x => x.id === jobChoice.id), x => x.jobChoiceAttributes);
					const locations = _.flatMap(jobChoicesWithLocations.filter(x => x.id === jobChoice.id), x => x.jobChoiceLocations);
					const planOptionsAssocs = _.flatMap(jobChoiceWithJobPlanOptionsAssocs.filter(x => x.id === jobChoice.id), x => x.jobChoiceJobPlanOptionAssocs);

					jobChoice.jobChoiceAttributes = attributes ?? [];
					jobChoice.jobChoiceLocations = locations ?? [];
					jobChoice.jobChoiceJobPlanOptionAssocs = planOptionsAssocs ?? [];
				});

				// find the jobPlanOptions records
				const jobWithPlanOptions = data.filter(x => x.jobPlanOptions) as IJob[];
				const iJobPlanOptions = jobWithPlanOptions.find(x => x.jobPlanOptions.every(o => o.planOptionId))?.jobPlanOptions;

				// jobPlanOption is a bit different since it holds financialOptionIntegrationKey vs it being on the option level. So new JobPlanOption takes care of that mapping.
				iJob.jobPlanOptions = iJobPlanOptions ? iJobPlanOptions.map(po => new JobPlanOption(po)) : [];

				const jobPlanOptionsWithAttributes = jobWithPlanOptions.find(x => x.jobPlanOptions.every(c => c.jobPlanOptionAttributes))?.jobPlanOptions;
				const jobPlanOptionsWithLocations = jobWithPlanOptions.find(x => x.jobPlanOptions.every(c => c.jobPlanOptionLocations))?.jobPlanOptions;

				iJob.jobPlanOptions.map(jobPlanOption =>
				{
					// get matching location/attributes for the current jobPlanOption
					const attributes = _.flatMap(jobPlanOptionsWithAttributes.filter(x => x.id === jobPlanOption.id), x => x.jobPlanOptionAttributes);
					const locations = _.flatMap(jobPlanOptionsWithLocations.filter(x => x.id === jobPlanOption.id), x => x.jobPlanOptionLocations);

					jobPlanOption.jobPlanOptionAttributes = attributes ?? [];
					jobPlanOption.jobPlanOptionLocations = locations ?? [];
				});

				return iJob;
			}),
			switchMap(job => this.getJobChangeOrderGroups(job, salesAgreementId)),
			map(response => new Job(response)),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getJobChangeOrderGroups(jobDto: IJob, salesAgreementId?: number): Observable<IJob>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				const guid = newGuid();
				let requestBundles: string[] = [];
				let newRequest = (filter: string, select: string, expand: string) =>
				{
					let batch = `${environment.apiUrl}changeOrderGroups?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${encodeURIComponent('createdUtcDate desc')}`;

					requestBundles.push(batch);
				};

				const filter = !!salesAgreementId ? `jobChangeOrderGroupSalesAgreementAssocs/any(a: a/salesAgreementId eq ${salesAgreementId})` : `jobId eq ${jobDto.id}`;
				const expand = 'jobChangeOrderGroupSalesStatusHistories, note, jobChangeOrderGroupSalesAgreementAssocs($select=changeOrderGroupSequence,changeOrderGroupSequenceSuffix)';

				// const jobChangeOrdersSelect = 'id,decisionPointChoiceID,quantity,decisionPointChoiceCalculatedPrice,choiceLabel,action,overrideNoteId';
				const jobChangeOrderChoicesSelect = 'id,decisionPointChoiceID,quantity,decisionPointChoiceCalculatedPrice,choiceLabel,action,overrideNoteId';
				const jobChangeOrderChoiceLocationAttributesSelect = 'id,attributeGroupCommunityId,attributeCommunityId,action,attributeName,attributeGroupLabel,sku';
				const jobChangeOrderChoiceLocationsSelect = 'id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel,action';
				const jobChangeOrderChoiceChangeOrderPlanOptionAssocsSelect = 'jobChangeOrderPlanOptionId,jobChoiceEnabledOption';
				const jobChangeOrderChoiceChangeOrderPlanOptionAssocsFilter = 'jobChoiceEnabledOption eq true';
				const jobChangeOrderPlanOptionsSelect = 'id,jobChangeOrderId,planOptionId,action,qty,listPrice,optionSalesName,optionDescription,overrideNoteId,jobOptionTypeName';

				// job change orders
				newRequest(filter, '*', expand);
				newRequest(filter, 'id', `jobChangeOrders($expand=jobChangeOrderChoices($select=id),jobChangeOrderPlanOptions($select=id),jobChangeOrderHandings,jobChangeOrderNonStandardOptions,jobChangeOrderPlans,jobChangeOrderLots,jobSalesChangeOrderBuyers($select=id),jobSalesChangeOrderPriceAdjustments,jobSalesChangeOrderSalesPrograms($select=id),jobSalesChangeOrderTrusts)`);
				newRequest(filter, 'id', `jobChangeOrders($select=id;$expand=jobChangeOrderChoices($select=${jobChangeOrderChoicesSelect};$expand=jobChangeOrderChoiceAttributes($select=${jobChangeOrderChoiceLocationAttributesSelect}),jobChangeOrderChoiceLocations($select=${jobChangeOrderChoiceLocationsSelect};$expand=jobChangeOrderChoiceLocationAttributes($select=${jobChangeOrderChoiceLocationAttributesSelect})),jobChangeOrderChoiceChangeOrderPlanOptionAssocs($select=${jobChangeOrderChoiceChangeOrderPlanOptionAssocsSelect};$filter=${jobChangeOrderChoiceChangeOrderPlanOptionAssocsFilter})))`);
				newRequest(filter, 'id', `jobChangeOrders($select=id;$expand=jobChangeOrderPlanOptions($select=${jobChangeOrderPlanOptionsSelect};$expand=jobChangeOrderPlanOptionAttributes,jobChangeOrderPlanOptionLocations,planOptionCommunity($expand=optionCommunity($expand=option($select=financialOptionIntegrationKey)))))`);
				newRequest(filter, 'id', `jobChangeOrders($select=id;$expand=jobSalesChangeOrderBuyers($expand=opportunityContactAssoc($expand=opportunity)))`);
				newRequest(filter, 'id', `jobChangeOrders($select=id;$expand=jobSalesChangeOrderSalesPrograms($expand=salesProgram($select=id, salesProgramType, name)))`);

				const batchRequests = requestBundles.map(req => createBatchGet(req));

				const headers = createBatchHeaders(guid, token);
				const batch = createBatchBody(guid, batchRequests);

				return withSpinner(this._http).post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				const bodies: any[] = response.responses.map(r => r.body);
				let data = _.flatten(bodies.map(body =>
				{
					return body.value?.length > 0 ? body.value : null;
				}).filter(res => res)) as ChangeOrderGroup[];

				if (data.length === 0) {
					return jobDto;
				}

				// find the main change order group record
				let iChangeOrderGroupArray = data.filter(x => x.jobId);

				const groupWithJobChangeOrders = data.filter(x => x.jobChangeOrders?.every(co => co.jobChangeOrderTypeDescription));
				iChangeOrderGroupArray.forEach(cog =>
				{
					cog.jobChangeOrders = groupWithJobChangeOrders.find(x => x.id === cog.id)?.jobChangeOrders;
				});

				const groupWithChoices = data.filter(x => x.jobChangeOrders?.every(co => co.jobChangeOrderChoices?.every(coc => coc.decisionPointChoiceID)));
				const groupWithPlanOptions = data.filter(x => x.jobChangeOrders?.every(co => co.jobChangeOrderPlanOptions?.every(copo => copo.planOptionId)));
				const groupWithBuyers = data.filter(x => x.jobChangeOrders?.every(co => co.jobSalesChangeOrderBuyers?.every(scob => scob.buyerName)));
				const groupWithSalesPrograms = data.filter(x => x.jobChangeOrders?.every(co => co.jobSalesChangeOrderSalesPrograms?.every(cosp => cosp.salesProgramId)));

				groupWithJobChangeOrders.forEach(changeOrderGroup =>
				{
					changeOrderGroup.jobChangeOrders.map(jobChangeOrder =>
					{
						// get matching choices, planOptions, buyers/salesPrograms for the curretn jobChangeOrders
						const jobChangeOrderChoices = groupWithChoices.find(x => x.id === changeOrderGroup.id).jobChangeOrders.find(y => y.id === jobChangeOrder.id)?.jobChangeOrderChoices;
						const jobChangeOrderPlanOptions = groupWithPlanOptions.find(x => x.id === changeOrderGroup.id).jobChangeOrders.find(y => y.id === jobChangeOrder.id)?.jobChangeOrderPlanOptions;
						const jobSalesChangeOrderBuyers = groupWithBuyers.find(x => x.id === changeOrderGroup.id).jobChangeOrders.find(y => y.id === jobChangeOrder.id)?.jobSalesChangeOrderBuyers;
						const jobSalesChangeOrderSalesPrograms = groupWithSalesPrograms.find(x => x.id === changeOrderGroup.id).jobChangeOrders.find(y => y.id === jobChangeOrder.id)?.jobSalesChangeOrderSalesPrograms;

						jobChangeOrder.jobChangeOrderChoices = jobChangeOrderChoices ?? [];
						jobChangeOrder.jobChangeOrderPlanOptions = jobChangeOrderPlanOptions ?? [];
						jobChangeOrder.jobSalesChangeOrderBuyers = jobSalesChangeOrderBuyers ?? [];
						jobChangeOrder.jobSalesChangeOrderSalesPrograms = jobSalesChangeOrderSalesPrograms ?? [];
					});
				});

				// Fetch OFS date for job choices/plan options - JIO OFS date
				const outForSignatureDate = iChangeOrderGroupArray[iChangeOrderGroupArray.length - 1].jobChangeOrderGroupSalesStatusHistories.find(t => t.salesStatusId === 6);

				if (outForSignatureDate) {
					jobDto.jobChoices.forEach(jc =>
					{
						jc.outForSignatureDate = outForSignatureDate.salesStatusUtcDate;
					});

					jobDto.jobPlanOptions.forEach(jp =>
					{
						jp.outForSignatureDate = outForSignatureDate.salesStatusUtcDate;
					});
				}

				// Fetch OFS date for change order choices/change order plan options
				_.sortBy(iChangeOrderGroupArray, 'createdUtcDate').forEach(cog =>
				{
					let coOutForSignatureDate = cog.jobChangeOrderGroupSalesStatusHistories.find(t => t.salesStatusId === 6);

					if (coOutForSignatureDate) {
						cog.jobChangeOrders.forEach(jco =>
						{
							jco.jobChangeOrderChoices.forEach(jcoc =>
							{
								jcoc.outForSignatureDate = coOutForSignatureDate.salesStatusUtcDate;

								let index = jobDto.jobChoices.findIndex(jc => jc.dpChoiceId === jcoc.decisionPointChoiceID);

								if (index > -1) {
									jobDto.jobChoices[index].outForSignatureDate = jcoc.outForSignatureDate;
								}
							});

							jco.jobChangeOrderPlanOptions.forEach(jcop =>
							{
								jcop.outForSignatureDate = coOutForSignatureDate.salesStatusUtcDate;

								let index = jobDto.jobPlanOptions.findIndex(jc => jc.integrationKey === jcop.integrationKey);

								if (index > -1) {
									jobDto.jobPlanOptions[index].outForSignatureDate = jcop.outForSignatureDate;
								}
							});
						});
					}
				});

				jobDto.jobChangeOrderGroups = iChangeOrderGroupArray;

				return jobDto;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getFloorPlanImages(jobId: number, isChangeOrder: boolean): Observable<FloorPlanImage[]>
	{
		return this._http.get<any>(`${environment.apiUrl}jobs(${jobId})/floorPlanAttachments?isChangeOrder=${isChangeOrder}`).pipe(
			map(response =>
			{
				let images = response['value'].map(r =>
				{
					return new FloorPlanImage(r);
				});

				return images;
			})
		);
	}

	saveFloorPlanImages(jobId: number, floors: { index: number, name: string; }[], images: any[]): Observable<FloorPlanImage[]>
	{
		const floorPlanImages = floors.map((val, i) =>
		{
			return { floorName: val.name, floorIndex: val.index, svg: images[i].outerHTML } as FloorPlanImage;
		});

		return this._http.put(`${environment.apiUrl}jobs(${jobId})/floorPlanAttachments`, floorPlanImages).pipe(
			map(() =>
			{
				return floorPlanImages;
			}),
			catchError(error =>
			{
				console.error(error);
				return _throw(error);
			})
		);
	}
}
