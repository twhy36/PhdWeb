import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import {
	newGuid, createBatchGet, createBatchHeaders, createBatchBody, withSpinner, Contact, ESignEnvelope,
	ChangeOrderGroup, Job, IJob, SpecInformation, FloorPlanImage, IdentityService
} from 'phd-common';

import { environment } from '../../../../environments/environment';

import { ChangeOrderService } from './change-order.service';

import * as _ from 'lodash';

@Injectable()
export class JobService
{
	private _ds = encodeURIComponent('$');

	constructor(private _http: HttpClient, private identityService: IdentityService, private changeOrderService: ChangeOrderService) { }

	loadJob(jobId: number, salesAgreementId?: number): Observable<Job>
	{
		const expandJobChoices = `jobChoices($expand=jobChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel),jobChoiceLocations($expand=jobChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku);$select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel),jobChoiceJobPlanOptionAssocs;$select=id,dpChoiceId,dpChoiceQuantity,dpChoiceCalculatedPrice,choiceLabel)`;
		const expandJobOptions = `jobPlanOptions($expand=jobPlanOptionAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel),jobPlanOptionLocations($expand=jobPlanOptionLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku);$select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel),planOptionCommunity($expand=optionCommunity($expand=option($select=financialOptionIntegrationKey);$select=id);$select=id);$select=id,planOptionId,listPrice,optionSalesName,optionDescription,optionQty,jobOptionTypeName)`;

		let expand = `jobSalesAgreementAssocs($filter=isActive eq true ),lot($expand=lotPhysicalLotTypeAssocs($expand=physicalLotType),fieldManagerLotAssocs($expand=fieldManager($select=firstname,lastname)),customerCareManagerLotAssocs($expand=contact($select=firstname,lastname)),salesPhase($select=id,salesPhaseName),lotHandingAssocs($expand=handing);$select=id,lotBlock,premium,lotStatusDescription,streetAddress1,streetAddress2,city,stateProvince,postalCode,foundationType,lotBuildTypeDesc,unitNumber,salesBldgNbr,alternateLotBlock,constructionPhaseNbr,county),planCommunity($select=bedrooms,financialCommunityId,financialPlanIntegrationKey,footPrintDepth,footPrintWidth,foundation,fullBaths,garageConfiguration,halfBaths,id,isActive,isCommonPlan,masterBedLocation,masterPlanNumber,npcNumber,planSalesDescription,planSalesName,productConfiguration,productType,revisionNumber,specLevel,squareFeet,tcg,versionNumber),${expandJobChoices},${expandJobOptions},jobNonStandardOptions($select=id,name,description,financialOptionNumber,quantity,unitPrice), pendingConstructionStages($select=id, constructionStageName, constructionStageStartDate), jobConstructionStageHistories($select=id,constructionStageId,constructionStageStartDate), projectedDates($select=jobId, projectedStartDate, projectedFrameDate, projectedSecondDate, projectedFinalDate)`;
		let filter = `id eq ${jobId}`;
		let select = `id,financialCommunityId,constructionStageName,lotId,planId,handing,warrantyTypeDesc,startDate,projectedFinalDate,jobTypeName`;

		const url = `${environment.apiUrl}jobs?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<any>(url).pipe(
			switchMap(response => this.getJobChangeOrderGroups(response['value'][0], salesAgreementId)),
			map(response =>
			{
				return new Job(response);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getJobChangeOrderGroups(jobDto: IJob, salesAgreementId?: number): Observable<IJob>
	{
		const entity = `changeOrderGroups`;
		const expandChoiceAttributeLoc = `jobChangeOrderChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,action,attributeName,attributeGroupLabel)`;
		const expandChoiceAttributes = `jobChangeOrderChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,action,attributeName,attributeGroupLabel)`;
		const expandChoiceLocations = `jobChangeOrderChoiceLocations($expand=${expandChoiceAttributeLoc};$select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel,action)`;
		const expandJobChoices = `jobChangeOrderChoices($expand=${expandChoiceAttributes},${expandChoiceLocations},jobChangeOrderChoiceChangeOrderPlanOptionAssocs($select=jobChangeOrderPlanOptionId;$filter=jobChoiceEnabledOption eq true);$select=id,decisionPointChoiceID,quantity,decisionPointChoiceCalculatedPrice,choiceLabel,action,overrideNoteId)`;
		const expandPlanOptions = 'jobChangeOrderPlanOptions($expand=jobChangeOrderPlanOptionAttributes,jobChangeOrderPlanOptionLocations,planOptionCommunity($expand=optionCommunity($expand=option($select=financialOptionIntegrationKey))))';
		const expandOpportunityContact = `opportunityContactAssoc($expand=opportunity)`;
		const expandSalesChanges = `jobSalesChangeOrderBuyers($expand=${expandOpportunityContact}),jobSalesChangeOrderPriceAdjustments,jobSalesChangeOrderSalesPrograms($expand=salesProgram($select=id, salesProgramType, name)),jobSalesChangeOrderTrusts`;
		const expandSalesAgreementAssoc = `jobChangeOrderGroupSalesAgreementAssocs($select=changeOrderGroupSequence,changeOrderGroupSequenceSuffix)`;
		const expand = `contact($select=displayName),jobChangeOrders($expand=${expandJobChoices},${expandPlanOptions},salesNotesChangeOrders($expand=note($expand=noteTargetAudienceAssocs($expand=targetAudience))),jobChangeOrderHandings,jobChangeOrderNonStandardOptions,jobChangeOrderPlans,jobChangeOrderLots,${expandSalesChanges}),jobChangeOrderGroupSalesStatusHistories($orderby=salesStatusUtcDate desc),note,${expandSalesAgreementAssoc}`;
		const filter = !!salesAgreementId ? `jobChangeOrderGroupSalesAgreementAssocs/any(a: a/salesAgreementId eq ${salesAgreementId})` : `jobId eq ${jobDto.id}`;
		const orderby = 'createdUtcDate desc';

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(url).pipe(
			switchMap(response => this.getChangeOrderBuyerContacts(response.value)),
			map(response =>
			{
				const dtos = (response as Array<ChangeOrderGroup>).map(o => new ChangeOrderGroup(o));

				// Fetch OFS date for job choices/plan options - JIO OFS date
				let outForSignatureDate = dtos[dtos.length - 1].jobChangeOrderGroupSalesStatusHistories.find(t => t.salesStatusId === 6);

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

				_.sortBy(dtos, 'createdUtcDate').forEach(cog =>
				{
					let coOutForSignatureDate = cog.jobChangeOrderGroupSalesStatusHistories.find(t => t.salesStatusId === 6);

					if (coOutForSignatureDate)
					{
						cog.jobChangeOrders.forEach(jco =>
						{
							jco.jobChangeOrderChoices.forEach(jcoc =>
							{
								jcoc.outForSignatureDate = coOutForSignatureDate.salesStatusUtcDate;

								let index = jobDto.jobChoices.findIndex(jc => jc.dpChoiceId === jcoc.decisionPointChoiceID);

								if (index > -1)
								{
									jobDto.jobChoices[index].outForSignatureDate = jcoc.outForSignatureDate;
								}
							});

							jco.jobChangeOrderPlanOptions.forEach(jcop =>
							{
								jcop.outForSignatureDate = coOutForSignatureDate.salesStatusUtcDate;

								let index = jobDto.jobPlanOptions.findIndex(jc => jc.integrationKey === jcop.integrationKey);

								if (index > -1)
								{
									jobDto.jobPlanOptions[index].outForSignatureDate = jcop.outForSignatureDate;
								}
							});
						});
					}
				});

				jobDto.jobChangeOrderGroups = dtos;

				return jobDto;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getChangeOrderBuyerContacts(changeOrderGroups: any): Observable<Array<ChangeOrderGroup>>
	{
		const contactIds = _.flatMap(changeOrderGroups, g => _.flatMap(g.jobChangeOrders, co => _.flatMap(co.jobSalesChangeOrderBuyers, b => b.opportunityContactAssoc.contactId)));
		const select = 'id,prefix,firstName,middleName,lastName,suffix,preferredCommunicationMethod,dynamicsIntegrationKey';

		if (contactIds && contactIds.length)
		{
			return this.identityService.token.pipe(
				switchMap((token: string) =>
				{
					let guid = newGuid();
					let requests = contactIds.map(id => createBatchGet(`${environment.apiUrl}contacts(${id})?$expand=addressAssocs($expand=address),emailAssocs($expand=email),phoneAssocs($expand=phone)&$select=${select}`));
					let headers = createBatchHeaders(guid, token);
					let batch = createBatchBody(guid, requests);

					return this._http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
				}),
				map((response: any) =>
				{
					let newGroups = [...changeOrderGroups];
					let oppContactAssocs = _.flatMap(newGroups, g => _.flatMap(g.jobChangeOrders, co => _.flatMap(co.jobSalesChangeOrderBuyers, b => b.opportunityContactAssoc)));

					oppContactAssocs.forEach(c =>
					{
						let respContact = response.responses.find(r => r.body.id === c.contactId);

						if (respContact)
						{
							c.contact = new Contact(respContact.body);
						}
					});

					return newGroups;
				})
			);
		}
		return of(changeOrderGroups);
	}

	getJobByLotId(lotId: number): Observable<Job[]>
	{
		const expandChangeOrderGroups = `jobChangeOrderGroups($expand=jobChangeOrders($expand=jobChangeOrderHandings,jobChangeOrderNonStandardOptions,jobChangeOrderChoices))`;
		const expandJobChoices = `jobChoices($expand=jobChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku),jobChoiceLocations($expand=jobChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku);$select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel),jobChoiceJobPlanOptionAssocs)`;
		const expandJobOptions = `jobPlanOptions($expand=jobPlanOptionAttributes,jobPlanOptionLocations($expand=jobPlanOptionLocationAttributes),planOptionCommunity($expand=optionCommunity($expand=option($select=financialOptionIntegrationKey))))`;

		const expand = `${expandChangeOrderGroups},jobSalesInfos,lot($expand=lotPhysicalLotTypeAssocs($expand=physicalLotType),salesPhase,lotHandingAssocs($expand=handing($select=id,name))),planCommunity,${expandJobChoices},${expandJobOptions},jobNonStandardOptions, jobConstructionStageHistories($select=id, constructionStageId, constructionStageStartDate),projectedDates($select=jobId, projectedStartDate, projectedFrameDate, projectedSecondDate, projectedFinalDate)`;
		const select = `id,financialCommunityId,constructionStageName,lotId,planId,handing,warrantyTypeDesc,startDate`;
		
		const filter = `lotId eq ${lotId}`;

		const url = `${environment.apiUrl}jobs?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<any>(url).pipe(
			map((response: any) =>
				response.value
					.map((r: IJob) => new Job(r))
			)
		);
	}

	getSpecJobs(lotIDs: number[]): Observable<Job[]> {
		const expand = `jobChangeOrderGroups,jobSalesInfos,lot($expand=lotPhysicalLotTypeAssocs($expand=physicalLotType),salesPhase,lotHandingAssocs($expand=handing($select=id,name))),planCommunity,jobConstructionStageHistories($select=id, constructionStageId, constructionStageStartDate)`;
		const select = `id,financialCommunityId,constructionStageName,lotId,planId,handing,warrantyTypeDesc,startDate,createdBy`;

		const filter = `lotId in (${lotIDs.join(',')})`;

		const url = `${environment.apiUrl}jobs?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<any>(url).pipe(
			map((response: any) =>
				response.value
					.map((r: IJob) => new Job(r))
			)
		);
	}

	getESignEnvelopes(jobDto: Job): Observable<ESignEnvelope[]>
	{
		let changeOrderGroupIds: Array<number> = jobDto.changeOrderGroups.map(t => t.id);
		const filter = `edhChangeOrderGroupId in (${changeOrderGroupIds}) and eSignStatusId ne 4`;

		const url = `${environment.apiUrl}eSignEnvelopes?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				return response['value'] as ESignEnvelope[];
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveFloorPlanImages(jobId: number, floors: { index: number, name: string }[], images: any[])
	{
		var floorPlanImages = floors.map((val, i) =>
		{
			return { floorName: val.name, floorIndex: val.index, svg: images[i].outerHTML };
		});

		this._http.put(`${environment.apiUrl}jobs(${jobId})/floorPlanAttachments`, floorPlanImages)
			.subscribe();
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

	getPulteInfoByJobId(jobId: number): Observable<SpecInformation>
	{
		const filter = `jobId eq ${jobId}`;
		const url = `${environment.apiUrl}jobSalesInfos?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}`;

		return this._http.get<SpecInformation>(url).pipe(
			map(response =>
			{
				const pulteInfo = new SpecInformation();

				if (response['value'].length > 0)
				{
					return response['value'][0] as SpecInformation;
				}
				else
				{
					return pulteInfo;
				}
			})
		);
	}

	savePulteInfo(pulteInfo: SpecInformation)
	{
		const url = `${environment.apiUrl}jobSalesInfos(${pulteInfo.jobId})?`;

		return this._http.patch(url, pulteInfo).pipe(
			map(resp => resp as SpecInformation)
		);
	}

	getSalesAgreementPlan(salesAgreementId: number, jobId: number): Observable<number>
	{

		const expand = `jobChangeOrders($expand=jobChangeOrderPlans($select=action,planCommunityId);$select=id,jobChangeOrderTypeDescription),jobChangeOrderGroupSalesAgreementAssocs($select=salesAgreementId)`;
		const filter = `jobId eq ${jobId}`;
		const orderby = 'createdUtcDate desc';
		const select = `id,salesStatusDescription,jobChangeOrderGroupDescription,createdUtcDate`;
		const url = `${environment.apiUrl}changeOrderGroups?${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}orderby=${encodeURIComponent(orderby)}&${this._ds}select=${encodeURIComponent(select)}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				let planId = 0;
				const changeOrderGroupsDto = response['value'] as any[];
				const lastChangeOrderInAgreement = changeOrderGroupsDto.find(
					x => x.jobChangeOrderGroupSalesAgreementAssocs &&
						x.jobChangeOrderGroupSalesAgreementAssocs.length &&
						x.jobChangeOrderGroupSalesAgreementAssocs[0].salesAgreementId === salesAgreementId);

				if (lastChangeOrderInAgreement)
				{
					let changeOrderGroup = changeOrderGroupsDto.find(
						x => x.createdUtcDate < lastChangeOrderInAgreement.createdUtcDate &&
							x.salesStatusDescription === 'Approved' &&
							x.jobChangeOrders &&
							x.jobChangeOrders.findIndex(y => y.jobChangeOrderPlans && y.jobChangeOrderPlans.length) !== -1);

					// Voided agreement on a dirt sale
					if (!changeOrderGroup && lastChangeOrderInAgreement.salesStatusDescription === 'Withdrawn')
					{
						const jioChangeOrder = lastChangeOrderInAgreement.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'SalesJIO');
						if (jioChangeOrder)
						{
							changeOrderGroup = lastChangeOrderInAgreement;
						}
					}

					if (changeOrderGroup)
					{
						const changeOrderPlan = changeOrderGroup.jobChangeOrders[0].jobChangeOrderPlans.find(x => x.action === 'Add');
						if (changeOrderPlan)
						{
							planId = changeOrderPlan.planCommunityId;
						}
					}
				}

				return planId;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}
}
