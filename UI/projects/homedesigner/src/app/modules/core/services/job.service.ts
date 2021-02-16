import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import * as _ from 'lodash';

import { withSpinner, Job, IJob, ChangeOrderGroup, FloorPlanImage } from 'phd-common';

import { environment } from '../../../../environments/environment';

@Injectable()
export class JobService
{
	private _ds = encodeURIComponent('$');

	constructor(private _http: HttpClient) { }

	loadJob(jobId: number, salesAgreementId?: number): Observable<Job>
	{
		const expandJobChoices = `jobChoices($expand=jobChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel),jobChoiceLocations($expand=jobChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku);$select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel),jobChoiceJobPlanOptionAssocs;$select=id,dpChoiceId,dpChoiceQuantity,dpChoiceCalculatedPrice,choiceLabel)`;
		const expandJobOptions = `jobPlanOptions($expand=jobPlanOptionAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel),jobPlanOptionLocations($expand=jobPlanOptionLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku);$select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel),planOptionCommunity($expand=optionCommunity($expand=option($select=financialOptionIntegrationKey);$select=id);$select=id);$select=id,planOptionId,listPrice,optionSalesName,optionDescription,optionQty,jobOptionTypeName)`;

		let expand = `jobSalesAgreementAssocs($filter=isActive eq true ),lot($expand=lotPhysicalLotTypeAssocs($expand=physicalLotType),fieldManagerLotAssocs($expand=fieldManager($select=firstname,lastname)),customerCareManagerLotAssocs($expand=contact($select=firstname,lastname)),salesPhase($select=id,salesPhaseName),lotHandingAssocs($expand=handing);$select=id,lotBlock,premium,lotStatusDescription,streetAddress1,streetAddress2,city,stateProvince,postalCode,foundationType,lotBuildTypeDesc,unitNumber,salesBldgNbr,alternateLotBlock,constructionPhaseNbr,county),planCommunity($select=bedrooms,financialCommunityId,financialPlanIntegrationKey,footPrintDepth,footPrintWidth,foundation,fullBaths,garageConfiguration,halfBaths,id,isActive,isCommonPlan,masterBedLocation,masterPlanNumber,npcNumber,planSalesDescription,planSalesName,productConfiguration,productType,revisionNumber,specLevel,squareFeet,tcg,versionNumber),${expandJobChoices},${expandJobOptions},jobNonStandardOptions($select=id,name,description,financialOptionNumber,quantity,unitPrice), pendingConstructionStages($select=id, constructionStageName, constructionStageStartDate), jobConstructionStageHistories($select=id,constructionStageId,constructionStageStartDate)`;
		let filter = `id eq ${jobId}`;
		let select = `id,financialCommunityId,constructionStageName,lotId,planId,handing,startDate`;

		const url = `${environment.apiUrl}jobs?${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<any>(url).pipe(
			switchMap(response => this.getJobChangeOrderGroups(response['value'][0], salesAgreementId)),
			map(response => {
				return new Job(response);
			}),
			catchError(error => {
				console.error(error);

				return _throw(error);
			})
		);
	}

	getJobChangeOrderGroups(jobDto: IJob, salesAgreementId?: number): Observable<IJob> {
		const entity = `changeOrderGroups`;
		const expandChoiceAttributeLoc = `jobChangeOrderChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,action,attributeName,attributeGroupLabel)`;
		const expandChoiceAttributes = `jobChangeOrderChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,action,attributeName,attributeGroupLabel)`;
		const expandChoiceLocations = `jobChangeOrderChoiceLocations($expand=${expandChoiceAttributeLoc};$select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel,action)`;
		const expandJobChoices = `jobChangeOrderChoices($expand=${expandChoiceAttributes},${expandChoiceLocations},jobChangeOrderChoiceChangeOrderPlanOptionAssocs($select=jobChangeOrderPlanOptionId;$filter=jobChoiceEnabledOption eq true);$select=id,decisionPointChoiceID,quantity,decisionPointChoiceCalculatedPrice,choiceLabel,action,overrideNoteId)`;
		const expandPlanOptions = 'jobChangeOrderPlanOptions($expand=jobChangeOrderPlanOptionAttributes,jobChangeOrderPlanOptionLocations,planOptionCommunity($expand=optionCommunity($expand=option($select=financialOptionIntegrationKey))))';
		const expandOpportunityContact = `opportunityContactAssoc($expand=opportunity)`;
		const expandSalesChanges = `jobSalesChangeOrderBuyers($expand=${expandOpportunityContact}),jobSalesChangeOrderPriceAdjustments,jobSalesChangeOrderSalesPrograms($expand=salesProgram($select=id, salesProgramType, name)),jobSalesChangeOrderTrusts`;
		const expandSalesAgreementAssoc = `jobChangeOrderGroupSalesAgreementAssocs($select=changeOrderGroupSequence,changeOrderGroupSequenceSuffix)`;
		const expand = `contact($select=displayName),jobChangeOrders($expand=${expandJobChoices},${expandPlanOptions},jobChangeOrderHandings,jobChangeOrderNonStandardOptions,jobChangeOrderPlans,jobChangeOrderLots,${expandSalesChanges}),jobChangeOrderGroupSalesStatusHistories,note,${expandSalesAgreementAssoc}`;
		const filter = !!salesAgreementId ? `jobChangeOrderGroupSalesAgreementAssocs/any(a: a/salesAgreementId eq ${salesAgreementId})` : `jobId eq ${jobDto.id}`;
		const orderby = 'createdUtcDate desc';

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(url).pipe(
			map(response => {
				const dtos = (response['value'] as Array<ChangeOrderGroup>).map(o => new ChangeOrderGroup(o));

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
			catchError(error => {
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

}
