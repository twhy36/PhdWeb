import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { forkJoin, Observable, throwError as _throw } from 'rxjs';
import { map, catchError, switchMap, } from 'rxjs/operators';

import * as _ from 'lodash';

import { withSpinner, Job, IJob, ChangeOrderGroup, JobPlanOption } from 'phd-common';

import { environment } from '../../../../environments/environment';

@Injectable()
export class JobService
{
	private _ds = encodeURIComponent('$');

	constructor(private _http: HttpClient) { }

	loadJob(jobId: number, salesAgreementId?: number): Observable<Job>
	{
		const newRequest = (filter: string, select: string, expand: string): Observable<IJob> =>
		{
			const url = `${environment.apiUrl}jobs?${this._ds}filter=${filter}&${this._ds}select=${select}&${this._ds}expand=${expand}`;

			return withSpinner(this._http).get(url).pipe(
				map(response => response['value'][0] as IJob),
				catchError(error =>
				{
					console.error(error);

					return _throw(error);
				}),
			);
		};

		const filter = `id eq ${jobId}`;
		const select = 'id,financialCommunityId,constructionStageName,lotId,planId,handing,startDate';

		// select
		const planCommunitySelect = 'bedrooms,financialCommunityId,financialPlanIntegrationKey,footPrintDepth,footPrintWidth,foundation,fullBaths,garageConfiguration,halfBaths,id,isActive,isCommonPlan,masterBedLocation,masterPlanNumber,npcNumber,planSalesDescription,planSalesName,productConfiguration,productType,revisionNumber,specLevel,squareFeet,tcg,versionNumber';
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
		expand += `,planCommunity($select=${planCommunitySelect})`;
		expand += `,lot($select=${lotSelect})`;
		expand += `,jobNonStandardOptions($select=${jobNonStandardOptionsSelect})`;
		expand += `,pendingConstructionStages($select=${pendingConstructionStagesSelect})`;
		expand += `,jobConstructionStageHistories($select=${jobConstructionStageHistoriesSelect})`;

		return forkJoin([
			newRequest(filter, select, expand),
			newRequest(filter, 'id', `jobChoices($select=${jobChoicesSelect};$expand=jobChoiceAttributes($select=id),jobChoiceLocations($select=id;$expand=jobChoiceLocationAttributes($select=id)),jobChoiceJobPlanOptionAssocs($select=id))`),
			newRequest(filter, 'id', `jobChoices($select=id;$filter=jobChoiceAttributes/any();$expand=jobChoiceAttributes($select=${jobChoiceAttributesSelect}))`),
			newRequest(filter, 'id', `jobChoices($select=id;$expand=jobChoiceLocations($select=${jobChoiceLocationsSelect};$expand=jobChoiceLocationAttributes($select=${jobChoiceLocationAttributesSelect})))`),
			newRequest(filter, 'id', 'jobChoices($select=id;$expand=jobChoiceJobPlanOptionAssocs)'),
			newRequest(filter, 'id', `jobPlanOptions($select=${jobPlanOptionsSelect};$expand=jobPlanOptionAttributes($select=id),jobPlanOptionLocations($select=id;$expand=jobPlanOptionLocationAttributes($select=id)),planOptionCommunity($select=${planOptionCommunitySelect};$expand=optionCommunity($select=${optionCommunitySelect};$expand=option($select=${optionSelect}))))`),
			newRequest(filter, 'id', `jobPlanOptions($select=id;$expand=jobPlanOptionAttributes($select=${jobPlanOptionAttributesSelect}))`),
			newRequest(filter, 'id', `jobPlanOptions($select=id;$expand=jobPlanOptionLocations($select=${jobPlanOptionLocationsSelect};$expand=jobPlanOptionLocationAttributes($select=${jobPlanOptionLocationAttributesSelect})))`),
			newRequest(filter, 'id', `jobPlanOptions($select=id;$expand=planOptionCommunity($select=${planOptionCommunitySelect};$expand=optionCommunity($select=${optionCommunitySelect};$expand=option($select=${optionSelect}))))`),
		]).pipe(
			map(([
				mainJob,
				jobWithChoices, jobChoicesWithAttributes, jobChoicesWithLocations, jobChoiceWithJobPlanOptionsAssocs,
				jobWithPlanOptions, jobPlanOptionsWithAttributes, jobPlanOptionsWithLocations, jobPlanOptionsWithPlanOptionCommunity,
			]) =>
			{
				// find the main job record
				const iJob = mainJob;
				iJob.jobChoices = jobWithChoices?.jobChoices;

				iJob.jobChoices.map(jobChoice =>
				{
					// get matching location/attributes/planOptionAssocs for the current jobChoice
					const attributes = _.flatMap(jobChoicesWithAttributes?.jobChoices.filter(jc=>jc.id === jobChoice.id), x => x.jobChoiceAttributes);
					const locations = _.flatMap(jobChoicesWithLocations?.jobChoices.filter(jc=>jc.id === jobChoice.id), x => x.jobChoiceLocations);
					const planOptionsAssocs = _.flatMap(jobChoiceWithJobPlanOptionsAssocs?.jobChoices.filter(jc=>jc.id === jobChoice.id), x => x.jobChoiceJobPlanOptionAssocs);

					jobChoice.jobChoiceAttributes = attributes ?? [];
					jobChoice.jobChoiceLocations = locations ?? [];
					jobChoice.jobChoiceJobPlanOptionAssocs = planOptionsAssocs ?? [];
				});

				// find the jobPlanOptions records
				iJob.jobPlanOptions = jobWithPlanOptions?.jobPlanOptions.map(po => new JobPlanOption(po)) ?? [];

				iJob.jobPlanOptions.map(jobPlanOption =>
				{
					// get matching location/attributes for the current jobPlanOption
					const attributes = _.flatMap(jobPlanOptionsWithAttributes?.jobPlanOptions.filter(jpo => jpo.id === jobPlanOption.id), x => x.jobPlanOptionAttributes);
					const locations = _.flatMap(jobPlanOptionsWithLocations?.jobPlanOptions.filter(jpo => jpo.id === jobPlanOption.id), x => x.jobPlanOptionLocations);
					const integrationKey = jobPlanOptionsWithPlanOptionCommunity?.jobPlanOptions.filter(jpo => jpo.id === jobPlanOption.id).length > 0 ? new JobPlanOption(jobPlanOptionsWithPlanOptionCommunity?.jobPlanOptions.filter(jpo => jpo.id === jobPlanOption.id)[0]).integrationKey : '';

					jobPlanOption.jobPlanOptionAttributes = attributes ?? [];
					jobPlanOption.jobPlanOptionLocations = locations ?? [];
					jobPlanOption.integrationKey = integrationKey ?? '';
				});

				return iJob;
			}),
			switchMap(job => this.getJobChangeOrderGroups(job, salesAgreementId)),
			map(response => new Job(response)),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			}),
		);
	}

	getJobChangeOrderGroups(jobDto: IJob, salesAgreementId?: number): Observable<IJob>
	{
		const newRequest = (filter: string, select: string, expand: string): Observable<ChangeOrderGroup[]> =>
		{
			const url = `${environment.apiUrl}changeOrderGroups?${this._ds}filter=${filter}&${this._ds}select=${select}&${this._ds}expand=${expand}`;

			return this._http.get(url).pipe(
				map(response => response['value'] as ChangeOrderGroup[]),
				catchError(error =>
				{
					console.error(error);

					return _throw(error);
				}),
			);
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
		return forkJoin([
			newRequest(filter, '*', expand),
			newRequest(filter, 'id', 'jobChangeOrders($expand=jobChangeOrderChoices($select=id),jobChangeOrderPlanOptions($select=id),jobChangeOrderHandings,jobChangeOrderNonStandardOptions,jobChangeOrderPlans,jobChangeOrderLots,jobSalesChangeOrderBuyers($select=id),jobSalesChangeOrderPriceAdjustments,jobSalesChangeOrderSalesPrograms($select=id),jobSalesChangeOrderTrusts)'),
			newRequest(filter, 'id', `jobChangeOrders($select=id;$expand=jobChangeOrderChoices($select=${jobChangeOrderChoicesSelect};$expand=jobChangeOrderChoiceAttributes($select=${jobChangeOrderChoiceLocationAttributesSelect}),jobChangeOrderChoiceLocations($select=${jobChangeOrderChoiceLocationsSelect};$expand=jobChangeOrderChoiceLocationAttributes($select=${jobChangeOrderChoiceLocationAttributesSelect})),jobChangeOrderChoiceChangeOrderPlanOptionAssocs($select=${jobChangeOrderChoiceChangeOrderPlanOptionAssocsSelect};$filter=${jobChangeOrderChoiceChangeOrderPlanOptionAssocsFilter})))`),
			newRequest(filter, 'id', `jobChangeOrders($select=id;$expand=jobChangeOrderPlanOptions($select=${jobChangeOrderPlanOptionsSelect};$expand=jobChangeOrderPlanOptionAttributes,jobChangeOrderPlanOptionLocations,planOptionCommunity($expand=optionCommunity($expand=option($select=financialOptionIntegrationKey)))))`),
			newRequest(filter, 'id', 'jobChangeOrders($select=id;$expand=jobSalesChangeOrderBuyers($expand=opportunityContactAssoc($expand=opportunity)))'),
			newRequest(filter, 'id', 'jobChangeOrders($select=id;$expand=jobSalesChangeOrderSalesPrograms($expand=salesProgram($select=id, salesProgramType, name)))'),
		]).pipe(
			map(([iChangeOrderGroupArray, groupWithJobChangeOrders, groupWithChoices, groupWithPlanOptions, groupWithBuyers, groupWithSalesPrograms]) =>
			{
				iChangeOrderGroupArray.forEach(cog =>
				{
					cog.jobChangeOrders = groupWithJobChangeOrders.find(x => x.id === cog.id)?.jobChangeOrders;
				});

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

				if (outForSignatureDate)
				{
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
					const coOutForSignatureDate = cog.jobChangeOrderGroupSalesStatusHistories.find(t => t.salesStatusId === 6);

					if (coOutForSignatureDate)
					{
						cog.jobChangeOrders.forEach(jco =>
						{
							jco.jobChangeOrderChoices.forEach(jcoc =>
							{
								jcoc.outForSignatureDate = coOutForSignatureDate.salesStatusUtcDate;

								const index = jobDto.jobChoices.findIndex(jc => jc.dpChoiceId === jcoc.decisionPointChoiceID);

								if (index > -1)
								{
									jobDto.jobChoices[index].outForSignatureDate = jcoc.outForSignatureDate;
								}
							});

							jco.jobChangeOrderPlanOptions.forEach(jcop =>
							{
								jcop.outForSignatureDate = coOutForSignatureDate.salesStatusUtcDate;

								const index = jobDto.jobPlanOptions.findIndex(jc => jc.integrationKey === jcop.integrationKey);

								if (index > -1)
								{
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
}
