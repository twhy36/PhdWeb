import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import
{
	newGuid, createBatchGet, createBatchHeaders, createBatchBody, withSpinner, Contact, ESignEnvelope,
	ChangeOrderGroup, Job, IJob, SpecInformation, FloorPlanImage, IdentityService, JobPlanOption, TimeOfSaleOptionPrice, ManagerName,
	IPendingJobSummary, Constants
} from 'phd-common';

import { environment } from '../../../../environments/environment';

import { ContactService } from './contact.service';

import * as _ from 'lodash';

@Injectable()
export class JobService
{
	private _ds = encodeURIComponent('$');

	constructor(private _http: HttpClient, private identityService: IdentityService, private contactService: ContactService) { }

	loadJob(jobId: number, salesAgreementId?: number): Observable<Job>
	{
		const expandJobChoices = `jobChoices($select=id,dpChoiceId,dpChoiceQuantity,dpChoiceCalculatedPrice,choiceLabel;$expand=jobChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku),jobChoiceLocations($select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel;$expand=jobChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku)),jobChoiceJobPlanOptionAssocs($select=id,jobChoiceId,jobPlanOptionId,choiceEnabledOption))`;
		const expandJobOptions = `jobPlanOptions($select=id,planOptionId,listPrice,optionSalesName,optionDescription,optionQty,jobOptionTypeName;$expand=jobPlanOptionAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,sku),jobPlanOptionLocations($select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel;$expand=jobPlanOptionLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku)),planOptionCommunity($select=id;$expand=optionCommunity($select=id;$expand=option($select=financialOptionIntegrationKey))))`;
		const expandLot = `lot($expand=lotPhysicalLotTypeAssocs($select=lotId;$expand=physicalLotType),fieldManagerLotAssocs($select=lotId;$expand=fieldManager($select=firstname,lastname)),customerCareManagerLotAssocs($select=lotId,contactId),salesPhase($select=id,salesPhaseName),lotHandingAssocs($select=lotId;$expand=handing);$select=id,lotBlock,premium,lotStatusDescription,streetAddress1,streetAddress2,city,stateProvince,postalCode,foundationType,lotBuildTypeDesc,unitNumber,salesBldgNbr,alternateLotBlock,constructionPhaseNbr,county)`;

		const expand = `jobSalesAgreementAssocs($expand=salesAgreement($select=id,status);$select=jobId;$filter=isActive eq true),${expandLot},planCommunity($select=bedrooms,financialCommunityId,financialPlanIntegrationKey,footPrintDepth,footPrintWidth,foundation,fullBaths,garageConfiguration,halfBaths,id,isActive,isCommonPlan,masterBedLocation,masterPlanNumber,npcNumber,planSalesDescription,planSalesName,productConfiguration,productType,revisionNumber,specLevel,squareFeet,tcg,versionNumber),${expandJobChoices},${expandJobOptions},jobNonStandardOptions($select=id,name,description,financialOptionNumber,quantity,unitPrice),pendingConstructionStages($select=id,constructionStageName,constructionStageStartDate),jobConstructionStageHistories($select=id,constructionStageId,constructionStageStartDate), projectedDates($select=jobId,projectedStartDate,projectedFrameDate,projectedSecondDate,projectedFinalDate)`;
		const filter = `id eq ${jobId}`;
		const select = `id,financialCommunityId,constructionStageName,lotId,planId,handing,warrantyTypeDesc,startDate,projectedFinalDate,jobTypeName,createdBy`;

		const url = `${environment.apiUrl}jobs?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<any>(url).pipe(
			switchMap(response => this.getJobChangeOrderGroups(response['value'][0], salesAgreementId)),
			switchMap(response => this.getTimeOfSaleOptionPricesForJob(response)),
			switchMap(response =>
			{
				const job = new Job(response);
				const contactId = job.lot?.customerCareManagerLotAssocs?.length > 0 ? job.lot.customerCareManagerLotAssocs[0].contactId : 0;

				return contactId !== 0 ? this.contactService.getContact(contactId).pipe(
					map(contact =>
					{
						if (contact)
						{
							job.lot.customerCareManager = { firstName: contact.firstName, lastName: contact.lastName } as ManagerName;
						}

						return job;
					})) : of(job);
			}),
			map(job =>
			{
				return job;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	checkIfJobHasSalesAgreementAssocs(jobId: number): Observable<boolean>
	{
		const filter = `id eq ${jobId}`;
		const select = `id`;
		let expand = `jobSalesAgreementAssocs($expand=salesAgreement($select=id,status);$select=jobId;$filter=isActive eq true)`;
		const url = `${environment.apiUrl}jobs?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<any>(url).pipe(
			map(response =>
			{

				const jobs = response['value'] as Array<Job>;

				if (jobs?.length > 0)
				{
					return jobs[0]?.jobSalesAgreementAssocs?.findIndex(x => x.salesAgreement?.status !== Constants.AGREEMENT_STATUS_VOID && x.salesAgreement?.status !== Constants.AGREEMENT_STATUS_CANCEL && x.salesAgreement?.id !== 0) === -1;
				}
				else
				{
					return true;
				}
			})
		);
	}

	getJobChangeOrderGroups(jobDto: IJob, salesAgreementId?: number): Observable<IJob>
	{
		const entity = `changeOrderGroups`;
		const expandChoiceAttributeLoc = `jobChangeOrderChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,action,attributeName,attributeGroupLabel,sku)`;
		const expandChoiceAttributes = `jobChangeOrderChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,action,attributeName,attributeGroupLabel,sku)`;
		const expandChoiceLocations = `jobChangeOrderChoiceLocations($expand=${expandChoiceAttributeLoc};$select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel,action)`;
		const expandJobChoices = `jobChangeOrderChoices($expand=${expandChoiceAttributes},${expandChoiceLocations},jobChangeOrderChoiceChangeOrderPlanOptionAssocs($select=jobChangeOrderPlanOptionId,jobChoiceEnabledOption;$filter=jobChoiceEnabledOption eq true);$select=id,decisionPointChoiceID,quantity,decisionPointChoiceCalculatedPrice,choiceLabel,action,overrideNoteId)`;
		const jobChangeOrderPlanOptionAttributes = `jobChangeOrderPlanOptionAttributes($select=id,attributeName,attributeGroupLabel,manufacturer,sku,action,attributeGroupCommunityId)`;
		const jobChangeOrderPlanOptionLocations = `jobChangeOrderPlanOptionLocations($select=locationName,locationGroupLabel,quantity,action,locationGroupCommunityId)`;
		const optionCommunity = `optionCommunity($select=id,optionId,financialCommunityId,optionSubCategoryId,optionSalesName,optionDescription,isActive;$expand=option($select=financialOptionIntegrationKey))`;
		const planOptionCommunity = `planOptionCommunity($select=id,planId,optionCommunityId,cutOffDays,cutOffStage,isBaseHouseElevation,isBaseHouse,maxOrderQty,cutOffNote,listPrice,basePrice,preSaleEstimatedSalesPrice,sentToFinancialDate,rtpDate,isActive;$expand=${optionCommunity})`;
		const expandPlanOptions = `jobChangeOrderPlanOptions($select=id,jobChangeOrderId,planOptionId,action,qty,listPrice,optionSalesName,optionDescription,overrideNoteId,jobOptionTypeName;$expand=${jobChangeOrderPlanOptionAttributes},${jobChangeOrderPlanOptionLocations},${planOptionCommunity})`;
		const expandOpportunityContact = `opportunityContactAssoc($select=id,opportunityId,contactId,isPrimary,isDeleted;$expand=opportunity($select=id,dynamicsOpportunityId,salesCommunityId))`;
		const expandSalesChanges = `jobSalesChangeOrderBuyers($select=id,jobChangeOrderId,opportunityContactAssocId,buyerName,firstName,middleName,lastName,suffix,displayName,isPrimaryBuyer,sortKey,action;$expand=${expandOpportunityContact}),jobSalesChangeOrderPriceAdjustments($select=id,jobChangeOrderId,priceAdjustmentTypeName,amount,action),jobSalesChangeOrderSalesPrograms($select=id,jobChangeOrderId,salesProgramId,salesProgramDescription,amount,action;$expand=salesProgram($select=id, salesProgramType, name)),jobSalesChangeOrderTrusts($select=id,jobChangeOrderId,trustName,action)`;
		const expandSalesAgreementAssoc = `jobChangeOrderGroupSalesAgreementAssocs($select=changeOrderGroupSequence,changeOrderGroupSequenceSuffix)`;
		const expand = `contact($select=displayName),jobChangeOrders($select=id,jobChangeOrderGroupId,jobChangeOrderTypeDescription,createdBy,createdUtcDate,lastModifiedBy,lastModifiedUtcDate;$expand=${expandJobChoices},${expandPlanOptions},salesNotesChangeOrders($select=id,changeOrderId,noteId,action;$expand=note($select=id,noteSubCategoryId,noteContent,createdUtcDate,createdBy,lastModifiedUtcDate,lastModifiedBy;$expand=noteTargetAudienceAssocs($select=noteId,targetAudienceId;$expand=targetAudience))),jobChangeOrderHandings($select=id,jobChangeOrderId,overrideNoteId,handing,action,createdBy,createdUtcDate,lastModifiedBy,lastModifiedUtcDate),jobChangeOrderNonStandardOptions($select=id,jobChangeOrderId,nonStandardOptionName,nonStandardOptionDescription,financialOptionNumber,action,qty,unitPrice,createdBy,createdUtcDate,lastModifiedBy,lastModifiedUtcDate),jobChangeOrderPlans($select=id,jobChangeOrderId,planCommunityId,action,createdBy,createdUtcDate,lastModifiedBy,lastModifiedUtcDate),jobChangeOrderLots($select=id,jobChangeOrderId,lotId,overrideNoteId,action,revertToDirt,createdBy,createdUtcDate,lastModifiedBy,lastModifiedUtcDate),${expandSalesChanges}),jobChangeOrderGroupSalesStatusHistories($select=id,jobChangeOrderGroupId,salesStatusId,salesStatusUtcDate,salesStatusReason,createdBy,createdUtcDate;$orderby=salesStatusUtcDate desc),note($select=id,noteSubCategoryId,noteContent,createdBy,createdUtcDate,lastModifiedBy,lastModifiedUtcDate),${expandSalesAgreementAssoc}`;
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
				let outForSignatureDate = dtos[dtos.length - 1]?.jobChangeOrderGroupSalesStatusHistories.find(t => t.salesStatusId === 6);

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
					let coOutForSignatureDate = cog?.jobChangeOrderGroupSalesStatusHistories.find(t => t.salesStatusId === 6);

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

	getTimeOfSaleOptionPricesForJob(jobDto: IJob): Observable<IJob>
	{
		const entity = `timeOfSaleOptionPrices`;
		const filter = `edhJobId eq ${jobDto.id}`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(url).pipe(
			map(response =>
			{
				jobDto.timeOfSaleOptionPrices = (response['value'] as Array<TimeOfSaleOptionPrice>).map(o => new TimeOfSaleOptionPrice(o));

				return jobDto;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveTimeOfSaleOptionPrices(timeOfSaleOptionPrices: TimeOfSaleOptionPrice[]): Observable<TimeOfSaleOptionPrice[]>
	{
		const url = `${environment.apiUrl}SaveTimeOfSaleOptionPrices`;
		const body = {
			timeOfSaleOptionPrices: timeOfSaleOptionPrices
		}

		return this._http.post<TimeOfSaleOptionPrice[]>(url, body).pipe(
			map(response =>
			{
				return (response['value'] as Array<TimeOfSaleOptionPrice>).map(o => new TimeOfSaleOptionPrice(o));
			})
		);
	}

	deleteTimeOfSaleOptionPricesForJob(jobId: number): Observable<TimeOfSaleOptionPrice[]>
	{
		const url = `${environment.apiUrl}DeleteTimeOfSaleOptionPricesForJob`;
		const body = {
			jobId: jobId
		};

		return this._http.post<TimeOfSaleOptionPrice[]>(url, body).pipe(
			map(response =>
			{
				return (response['value'] as Array<TimeOfSaleOptionPrice>).map(o => new TimeOfSaleOptionPrice(o));
			})
		);
	}

	deleteTimeOfSaleOptionPrices(timeOfSaleOptionPrices: TimeOfSaleOptionPrice[], isRevertChangeOrder: boolean): Observable<TimeOfSaleOptionPrice[]>
	{
		const url = `${environment.apiUrl}DeleteTimeOfSaleOptionPrices`;
		const body = {
			timeOfSaleOptionPrices: timeOfSaleOptionPrices,
			isRevertChangeOrder: isRevertChangeOrder
		};

		return this._http.post<TimeOfSaleOptionPrice[]>(url, body).pipe(
			map(response =>
			{
				return (response['value'] as Array<TimeOfSaleOptionPrice>).map(o => new TimeOfSaleOptionPrice(o));
			})
		);
	}

	updateTimeOfSaleOptionPrices(timeOfSaleOptionPrices: TimeOfSaleOptionPrice[]): Observable<TimeOfSaleOptionPrice[]>
	{
		const url = `${environment.apiUrl}UpdateTimeOfSaleOptionPrices`;
		const body = {
			timeOfSaleOptionPrices: timeOfSaleOptionPrices
		};

		return this._http.patch<TimeOfSaleOptionPrice[]>(url, body).pipe(
			map(response =>
			{
				return (response['value'] as Array<TimeOfSaleOptionPrice>).map(o => new TimeOfSaleOptionPrice(o));
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

	getJobByLotId(lotId: number): Observable<Job>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let guid = newGuid();
				let requestBundles: string[] = [];
				let newRequest = (filter: string, select: string, expand: string) =>
				{
					let batch = `${environment.apiUrl}jobs?${this._ds}filter=${filter}&${this._ds}select=${select}&${this._ds}expand=${expand}`;

					requestBundles.push(batch);
				};

				const jobChangeOrderGroupsSelect = `id,changePrice,constructionRejectReason,constructionStatusDescription,constructionStatusLastModifiedBy,constructionStatusUTCDate,createdbyContactId,jobChangeOrderGroupDescription,jobId,noteId,salesStatusDescription,salesStatusUTCDate`;
				const jobSalesInfosSelect = `jobId,discountAmount,discountExpirationDate,hotHomeBullet1,hotHomeBullet2,hotHomeBullet3,hotHomeBullet4,hotHomeBullet5,hotHomeBullet6,isHotHomeActive,isPublishOnWebSite,numberBedOverride,numberFullBathOverride,numberGarageOverride,numberHalfBathOverride,specPrice,squareFeetOverride,webSiteAvailableDate,webSiteDescription`;
				const lotSelect = `id,alternateLotBlock,block,city,closeOfEscrow,constructionBuildingNumber,constructionPhaseNbr,country,county,facing,financialCommunityId,foundationType,isActiveFinance,isMasterUnit,lotBlock,lotBuildTypeDesc,lotCost,lotNumber,lotSequenceNumber,lotStatusDescription,postalCode,premium,releaseNumber,salesBldgNbr,salesPhaseId,stateProvince,streetAddress1,streetAddress2,unitNumber`;
				const planCommunitySelect = `id,bedrooms,financialCommunityId,financialPlanIntegrationKey,footPrintDepth,footPrintWidth,foundation,fullBaths,garageConfiguration,halfBaths,isActive,isCommonPlan,masterBedLocation,masterPlanNumber,npcNumber,planSalesDescription,planSalesName,productConfiguration,productType,revisionNumber,specLevel,squareFeet,tcg,versionNumber`;
				const jobNonStandardOptionsSelect = `id,constructionComplete,description,financialOptionNumber,jobId,name,quantity,unitPrice`;
				const jobChangeOrderChoicesSelect = `id,action,choiceDescription,choiceLabel,decisionPointChoiceCalculatedPrice,decisionPointChoiceID,decisionPointLabel,groupLabel,jobChangeOrderId,overrideNoteId,quantity,subGroupLabel`;
				const jobChoicesSelect = `id,choiceDescription,choiceLabel,decisionPointLabel,dpChoiceCalculatedPrice,dpChoiceId,dpChoiceQuantity,groupLabel,jobChoiceAttributes,jobChoiceJobPlanOptionAssocs,jobChoiceLocations,jobId,sortOrder,subGroupLabel`;

				let expand = `jobChangeOrderGroups($select=${jobChangeOrderGroupsSelect};$expand=jobChangeOrders($select=id,jobChangeOrderTypeDescription)),`;
				expand += `jobSalesInfos($select=${jobSalesInfosSelect}),`;
				expand += `lot($select=${lotSelect};$expand=lotPhysicalLotTypeAssocs($expand=physicalLotType),salesPhase($select=id,financialCommunityId,salesPhaseName),lotHandingAssocs($expand=handing($select=id,name))),`;
				expand += `planCommunity($select=${planCommunitySelect}), jobNonStandardOptions($select=${jobNonStandardOptionsSelect}), jobConstructionStageHistories($select=id,constructionStageId,constructionStageStartDate),`;
				expand += `projectedDates($select=jobId, projectedStartDate, projectedFrameDate, projectedSecondDate, projectedFinalDate)`;

				const select = `id,financialCommunityId,constructionStageName,lotId,planId,handing,warrantyTypeDesc,startDate,projectedFinalDate,jobTypeName`;

				const filter = `lotId eq ${lotId}`;

				newRequest(filter, select, expand);
				newRequest(filter, `id`, `jobChangeOrderGroups($select=id;$expand=jobChangeOrders($select=id;$expand=jobChangeOrderHandings($select=id,action,handing,jobChangeOrderId,overrideNoteId)))`);
				newRequest(filter, `id`, `jobChangeOrderGroups($select=id;$expand=jobChangeOrders($select=id;$expand=jobChangeOrderNonStandardOptions($select=id,name,description,financialOptionNumber,quantity,unitPrice)))`);
				newRequest(filter, `id`, `jobChangeOrderGroups($select=id;$expand=jobChangeOrders($select=id;$expand=jobChangeOrderChoices($select=${jobChangeOrderChoicesSelect})))`);
				newRequest(filter, `id`, `jobChoices($select=${jobChoicesSelect};$expand=jobChoiceJobPlanOptionAssocs($select=id,choiceEnabledOption,jobChoiceId,jobPlanOptionId))`);
				newRequest(filter, `id`, `jobChoices($select=id;$filter=jobChoiceAttributes/any();$expand=jobChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku))`);
				newRequest(filter, `id`, `jobChoices($select=id;$filter=jobChoiceLocations/any();$expand=jobChoiceLocations($select=id,locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel;$expand=jobChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku)))`);
				newRequest(filter, `id`, `jobPlanOptions($select=id,constructionComplete,jobId,jobOptionTypeName,listPrice,optionDescription,optionQty,optionSalesName,planOptionId;$expand=planOptionCommunity($select=id;$expand=optionCommunity($select=id;$expand=option($select=id,financialOptionIntegrationKey))))`);
				newRequest(filter, `id`, `jobPlanOptions($select=id;$filter=jobPlanOptionAttributes/any();$expand=jobPlanOptionAttributes($select=id,attributeCommunityId,attributeGroupCommunityId,attributeGroupLabel,attributeName,jobPlanOptionId,manufacturer,sku))`);
				newRequest(filter, `id`, `jobPlanOptions($select=id;$filter=jobPlanOptionLocations/any();$expand=jobPlanOptionLocations($select=id, jobPlanOptionId, locationGroupCommunityId,locationCommunityId,quantity,locationName,locationGroupLabel;$expand=jobPlanOptionLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel,manufacturer,sku)))`);

				let batchRequests = requestBundles.map(req => createBatchGet(req));

				var headers = createBatchHeaders(guid, token);
				var batch = createBatchBody(guid, batchRequests);

				return this._http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				let bodies: any[] = response.responses.map(r => r.body);
				let data = _.flatten(bodies.map(body =>
				{
					return body.value?.length > 0 ? body.value : null;
				}).filter(res => res)) as IJob[];

				if (data.length === 0)
				{
					return new Job();
				}

				// find the main job record. Should be the only one with financialCommunityId
				let iJob = data.find(x => x.financialCommunityId);
				const iJobWithCog = data.filter(d => d.jobChangeOrderGroups && !d.financialCommunityId);

				iJob.jobChangeOrderGroups.map(cog =>
				{
					// pull out matching changeOrderGroups
					const cogData = _.flatMap(iJobWithCog, x => x.jobChangeOrderGroups);

					if (cogData.length > 0)
					{
						cog.jobChangeOrders.map(co =>
						{
							// pull out matching changeOrders
							let coData = cogData.find(x => x.id === cog.id).jobChangeOrders.find(d => d.id === co.id);

							if (coData)
							{
								co.jobChangeOrderHandings = coData?.jobChangeOrderHandings ?? [];
								co.jobChangeOrderNonStandardOptions = coData?.jobChangeOrderNonStandardOptions ?? [];
								co.jobChangeOrderChoices = coData?.jobChangeOrderChoices ?? [];
							}
						});
					}
				});

				// find the jobChoice records
				const jobWithChoices = data.filter(x => x.jobChoices) as IJob[];

				// set the main jobChoices record
				iJob.jobChoices = jobWithChoices.find(x => x.jobChoices.every(c => c.dpChoiceId))?.jobChoices;

				const jobChoicesWithAttributes = jobWithChoices.find(x => x.jobChoices.every(c => c.jobChoiceAttributes))?.jobChoices;
				const jobChoicesWithLocations = jobWithChoices.find(x => x.jobChoices.every(c => c.jobChoiceLocations))?.jobChoices;

				iJob.jobChoices.map(jobChoice =>
				{
					// get matching location/attributes for the current jobChoice
					const attributes = _.flatMap(jobChoicesWithAttributes.filter(x => x.id === jobChoice.id), x => x.jobChoiceAttributes);
					const locations = _.flatMap(jobChoicesWithLocations.filter(x => x.id === jobChoice.id), x => x.jobChoiceLocations);

					jobChoice.jobChoiceAttributes = attributes ?? [];
					jobChoice.jobChoiceLocations = locations ?? [];
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

				return new Job(iJob);
			})
		);
	}

	getSpecJobs(lotIDs: number[]): Observable<Job[]>
	{
		const expand = `jobChoices($select=id;$top=1),jobPlanOptions($select=id,planOptionId,jobOptionTypeName;$filter=jobOptionTypeName eq 'Elevation'),jobSalesInfos($select=specPrice),lot($select=id,lotBlock)`;
		const select = `id,financialCommunityId,constructionStageName,lotId,planId,handing,warrantyTypeDesc,startDate,createdBy`;
		const COGExpand = `jobChangeOrderGroups($select=id,jobId,jobChangeOrderGroupDescription,salesStatusDescription,constructionStatusDescription,createdUtcDate)`
		const filter = `lotId in (${lotIDs.join(',')})`;

		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let guid = newGuid();
				let requests = [
					createBatchGet(`${environment.apiUrl}jobs?${this._ds}filter=${filter}&${this._ds}select=${select}&${this._ds}expand=${expand}`),
					createBatchGet(`${environment.apiUrl}jobs?${this._ds}filter=${filter}&${this._ds}expand=${COGExpand}&${this._ds}select=${'id'}`)
				];
				let headers = createBatchHeaders(guid, token);
				let batch = createBatchBody(guid, requests);

				return this._http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				let bodies = response.responses.map(r => r.body);
				let jobs = bodies[0].value.map((o) => new Job(o));

				jobs.forEach(job => 
				{
					const cog = bodies[1].value;

					job.changeOrderGroups = cog.find(cogJob => cogJob.id === job.id)?.jobChangeOrderGroups;
				});

				return jobs;
			}));
	}

	getESignEnvelopes(jobDto: Job): Observable<ESignEnvelope[]>
	{
		let changeOrderGroupIds: Array<number> = jobDto.changeOrderGroups.map(t => t.id);
		const filter = `edhChangeOrderGroupId in (${changeOrderGroupIds}) and eSignStatusId ne 4`;
		const expand = 'eSignRecipientEnvelopeEvents'

		const url = `${environment.apiUrl}eSignEnvelopes?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}`;

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

	saveFloorPlanImages(jobId: number, floors: { index: number, name: string }[], images: any[]): Observable<FloorPlanImage[]>
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

	updateSpecJobPricing(lotId: number): Observable<JobPlanOption[]>
	{
		return this._http.post<any>(`${environment.apiUrl}UpdateJobPricing`, { lotId: lotId }).pipe(
			map(response => response.value)
		);
	}

	updatePendingJobSummary(pendingJobSummary: IPendingJobSummary)
	{
		const url = `${environment.apiUrl}pendingJobSummary(${pendingJobSummary.jobId})`;

		return this._http.patch(url, pendingJobSummary).pipe(
			map(resp => resp as IPendingJobSummary)
		);
	}
}
