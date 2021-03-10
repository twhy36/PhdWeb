import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { map, catchError, switchMap, withLatestFrom, take, combineLatest } from 'rxjs/operators';
import { _throw } from 'rxjs/observable/throw';

import { environment } from '../../../../environments/environment';

import { withSpinner } from 'phd-common/extensions/withSpinner.extension';

import { defaultOnNotFound } from '../../shared/classes/default-on-not-found';

import { Template, ITemplateInfo } from '../../shared/models/template.model';
import { SDPoint } from '../../shared/models/summary.model';
import { IFinancialCommunityESign, FinancialCommunityESign, IESignRecipient, MergeFieldData, MergeFieldDto } from '../../shared/models/contract.model';
import { ChangeOrderChoice, ChangeOrderNonStandardOption, ChangeOrderGroup } from '../../shared/models/job-change-order.model';
import { Plan } from '../../shared/models/plan.model';
import { DecisionPoint } from '../../shared/models/tree.model.new';
import { LotExt } from '../../shared/models/lot.model';
import { EnvelopeInfo } from '../../shared/models/envelope-info.model';
import { of } from 'rxjs/observable/of';
import { convertMapToMergeFieldDto, getCurrentHouseSelections, getChangeOrderGroupSelections } from '../../shared/classes/merge-field-utils.class';
import * as _ from 'lodash';
import { formatPhoneNumber } from 'phd-common/utils';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../../modules/ngrx-store/reducers';
import { Buyer } from '../../shared/models/buyer.model';
import { isNull } from "../../shared/classes/string-utils.class";
import { Contact, PhoneType } from '../../shared/models/contact.model';
import * as fromLot from '../../ngrx-store/lot/reducer';
import * as fromChangeOrder from '../../ngrx-store/change-order/reducer';
import { SalesAgreementProgram } from '../../shared/models/sales-agreement.model';
import { TreeService } from '../../core/services/tree.service';
import { ESignTypeEnum } from '../../shared/models/esign-envelope.model';

@Injectable()
export class ContractService
{
	private _ds: string = encodeURIComponent("$");

	constructor(private _http: HttpClient,
		private store: Store<fromRoot.State>,
		private treeService: TreeService) { }

	getTemplates(marketId: number, financialCommunityId: number): Observable<Array<Template>>
	{
		const entity = `contractTemplates`;
		const filter = `org/edhMarketId eq ${marketId} and templateFinancialCommunityAssocs/any(c: c/org/edhFinancialCommunityId eq ${financialCommunityId}) and status eq 'In Use'`;
		const orderBy = `orderby=displayOrder`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}${encodeURIComponent(orderBy)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				const dto = response['value'] as Array<Template>;
				return dto.map(t => new Template(t));
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	createEnvelope(mergeFields: MergeFieldDto[], jioSelections: any, templates: Array<ITemplateInfo>, financialCommunityId: number, salesAgreementNumber: string, salesAgreementStatus: string, envelopeInfo: EnvelopeInfo, jobId: number, changeOrderGroupId: number, constructionChangeOrderSelectionsDto?: any, salesChangeOrderSelections?: any, planChangeOrderSelectionsDto?: any, nonStandardChangeOrderSelectionsDto?: Array<ChangeOrderNonStandardOption>, lotTransferSeletionsDto?: { addedLot: LotExt, deletedLot: LotExt }, changeOrderInformation?: any, isPreview?: boolean): Observable<string>
	{
		const action = `CreateEnvelope`;
		const url = `${environment.apiUrl}${action}`;
		const data = {
			isPreview: isPreview ? isPreview : false,
			templates: templates,
			mergeFields: mergeFields,
			jioSelections: jioSelections,
			financialCommunityId: financialCommunityId,
			jobId: jobId,
			changeOrderGroupId: changeOrderGroupId,
			salesAgreementNumber: salesAgreementNumber,
			salesAgreementStatus: salesAgreementStatus,
			constructionChangeOrderSelections: constructionChangeOrderSelectionsDto,
			salesChangeOrderSelections: salesChangeOrderSelections,
			planChangeOrderSelections: planChangeOrderSelectionsDto,
			nonStandardChangeOrderSelections: nonStandardChangeOrderSelectionsDto,
			lotTransferChangeOrderSelections: lotTransferSeletionsDto ? { lotDtos: lotTransferSeletionsDto } : null,
			changeOrderInformation: changeOrderInformation,
			salesAgreementInfo: { ...envelopeInfo }
		};

		return withSpinner(this._http).post<any>(url, data).pipe(
			map(response => response.value),
			catchError(error =>
			{
				return this.deleteSnapshot(jobId, changeOrderGroupId).pipe(
					switchMap(() => _throw(error))
				);
			})
		);
	}


	downloadEnvelope(envelopeId: string): Observable<string>
	{
		const action = `GetEnvelopeByteArray(envelopeId='${envelopeId}')`;
		const url = `${environment.apiUrl}${action}`;
		const headers = new HttpHeaders({
			'Content-Type': 'application/json',
			'Accept': 'application/pdf'
		});

		return withSpinner(this._http).get(url, { headers: headers, responseType: "blob" }).pipe(
			map(response =>
			{
				return window.URL.createObjectURL(response);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getCustomMergeFields(marketId: number, financialCommunityId: number): Observable<Map<string, string>>
	{
		const entity = `mergeFields`;
		const filter = `org/edhMarketId eq ${marketId} and isActive eq true`;
		const expand = `customFieldFinancialCommunities($filter=org/edhFinancialCommunityId eq ${financialCommunityId} and isActive eq true;$select=fieldValue)`;
		const select = `fieldName,fieldValue`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				const dto = response['value'] as Array<any>;

				let map = new Map<string, string>();

				dto.forEach(d =>
				{
					map.set(d.fieldName, d.customFieldFinancialCommunities.length ? d.customFieldFinancialCommunities[0].fieldValue : d.fieldValue);
				});

				return map;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getFinancialCommunityESign(financialCommunityId: number): Observable<FinancialCommunityESign>
	{
		const entity = `eSignFields(${financialCommunityId})`;
		const url = `${environment.apiUrl}${entity}`;

		return this._http.get<IFinancialCommunityESign>(url).pipe(
			map(dto => new FinancialCommunityESign(dto)),
			defaultOnNotFound("getFinancialCommunityESign")
		);
	}

	sendEnvelope(salesAgreementId: number, envelopeId: string, returnUrl: string, recipients: IESignRecipient[], financialCommunityId: number, eSignType: ESignTypeEnum, edit: boolean = false): Observable<string>
	{
		const entity = `SendEnvelope`;
		const url = `${environment.apiUrl}${entity}`;
		const data = {
			eSignData: {
				salesAgreementId: salesAgreementId,
				envelopeId: envelopeId,
				returnUrl: returnUrl,
				recipients: recipients,
				financialCommunityId: financialCommunityId,
				edit: edit,
				eSignType: ESignTypeEnum[eSignType]
			}
		};

		return this._http.post<string>(url, data).pipe(
			map(response => response['value']),
			defaultOnNotFound("SendEnvelope")
		);
	}

	voidOutForSignatureEnvelope(salesAgreementId: number, envelopeId: string, eSignStatus: string, jobId: number, changeOrderGroupId: number): Observable<string>
	{
		const action = `VoidOutForSignatureEnvelope`;
		const url = `${environment.apiUrl}${action}`;
		const data = {
			salesAgreementId: salesAgreementId,
			envelopeId: envelopeId,
			eSignStatus: eSignStatus,
			jobId: jobId,
			changeOrderGroupId: changeOrderGroupId
		};

		return withSpinner(this._http).post<any>(url, data).pipe(
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getConstructionChangeOrderPdfData(jobChangeOrderChoicesDto: Array<ChangeOrderChoice>)
	{
		let jobChangeOrderChoices = jobChangeOrderChoicesDto.map(t =>
		{
			let jobChangeOrderChoiceAttributes = t.jobChangeOrderChoiceAttributes.map(attr =>
			{
				return {
					attributeGroupCommunityId: attr.attributeGroupCommunityId,
					attributeCommunityId: attr.attributeCommunityId,
					action: attr.action,
					attributeGroupLabel: attr.attributeGroupLabel,
					attributeName: attr.attributeName,
					manufacturer: attr.manufacturer ? attr.manufacturer : null,
					sku: attr.sku ? attr.sku : null,
				};
			});

			let jobChangeOrderChoiceLocations = t.jobChangeOrderChoiceLocations.map(loc =>
			{
				return {
					locationGroupCommunityId: loc.locationGroupCommunityId,
					locationCommunityId: loc.locationCommunityId,
					action: loc.action,
					locationGroupLabel: loc.locationGroupLabel,
					locationName: loc.locationName,
					quantity: loc.quantity,
					attributes: loc.jobChangeOrderChoiceLocationAttributes.map(locAttr =>
					{
						return {
							attributeGroupCommunityId: locAttr.attributeGroupCommunityId,
							attributeCommunityId: locAttr.attributeCommunityId,
							action: locAttr.action,
							attributeGroupLabel: locAttr.attributeGroupLabel,
							attributeName: locAttr.attributeName,
							manufacturer: locAttr.manufacturer ? locAttr.manufacturer : null,
							sku: locAttr.sku ? locAttr.sku : null
						}
					})
				};
			});

			return {
				choiceLabel: t.choiceLabel,
				decisionPointLabel: t.decisionPointLabel,
				dpChoiceCalculatedPrice: t.decisionPointChoiceCalculatedPrice,
				dpChoiceQuantity: t.quantity,
				groupLabel: t.groupLabel,
				subgroupLabel: t.subgroupLabel,
				isColorScheme: t.isColorScheme,
				isElevation: t.isElevation,
				locations: jobChangeOrderChoiceLocations,
				options: [],
				overrideNote: t.overrideNote,
				dpChoiceId: t.decisionPointChoiceID,
				divChoiceCatalogId: t.divChoiceCatalogId,
				attributes: jobChangeOrderChoiceAttributes,
				action: t.action
			};
		});

		return jobChangeOrderChoices;
	}

	getPlanChangeOrderPdfData(plansDto: Array<Plan>, decisionPointsDto: Array<DecisionPoint>, jobChangeOrderPlansDto: Array<any>, jobChangeOrderChoicesDto: Array<ChangeOrderChoice>, currentHouseSelectionsPoints: Array<SDPoint>)
	{
		let changeOrderPlans: Array<Plan> = [];

		jobChangeOrderPlansDto.forEach(p =>
		{
			changeOrderPlans.push(plansDto.find(t => t.id === p.planCommunityId));
		});

		let plans = changeOrderPlans.map(p =>
		{
			return {
				name: p.salesName,
				value: p.price ? p.price : 0,
				action: jobChangeOrderPlansDto.find(t => t.planCommunityId === p.id).action
			};
		});

		let planChangeOrderSelections = {
			plans: plans,
		};

		return planChangeOrderSelections;
	}

	getNonStandardChangeOrderPdfData(nonStandardOptionDtos: Array<ChangeOrderNonStandardOption>)
	{
		const nonStandardOptionSelections = nonStandardOptionDtos.map(opt =>
		{
			return {
				name: opt.nonStandardOptionName,
				description: opt.nonStandardOptionDescription,
				optionNumber: opt.financialOptionNumber,
				quantity: opt.qty,
				price: opt.unitPrice,
				action: opt.action
			};
		});

		return nonStandardOptionSelections;
	}

	getLotTransferPdfData(addedLot: LotExt, deletedLot: LotExt)
	{
		const lotTransferSelections = [
			{ ...addedLot, action: 'Add' },
			{ ...deletedLot, action: 'Delete' }
		].map(lot =>
		{
			return {
				lotBlock: lot.lotBlock,
				address: lot.streetAddress1 ? lot.streetAddress1 : '' + lot.streetAddress2 ? lot.streetAddress2 : '',
				garage: lot.handings.map(t => t.name),
				value: lot.premium,
				action: lot.action
			}
		});

		return lotTransferSelections;
	}

	lockMergeFields(customMergeFields: Map<string, string>, systemMergeFields: Map<string, string>, jobId: number): Observable<string>
	{
		const action = `LockMergeFields`;
		const url = `${environment.apiUrl}${action}`;
		const data = {
			mergeFields: {
				customMergeFields: [...convertMapToMergeFieldDto(customMergeFields)],
				systemMergeFields: [...convertMapToMergeFieldDto(systemMergeFields)]
			},
			jobId: jobId,
		};

		return withSpinner(this._http).post<any>(url, data).pipe(
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getLockedMergeFields(jobId: number): Observable<MergeFieldData>
	{
		const entity = `GetLockedMergeFields(jobId=${jobId})`;
		const url = `${environment.apiUrl}${entity}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				return response as MergeFieldData;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	deleteSnapshot(jobId: number, changeOrderGroupId: number): Observable<string>
	{
		const action = `DeleteSnapShot`;
		const url = `${environment.apiUrl}${action}`;
		const data = {
			jobId: jobId,
			changeOrderGroupId: changeOrderGroupId
		};

		return withSpinner(this._http).post<any>(url, data).pipe(
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveSnapshot(snapshotData: any, jobId: number, changeOrderGroupId: number): Observable<string>
	{
		const action = `SaveSnapShot`;

		const url = `${environment.apiUrl}${action}?changeOrderGroupId=${changeOrderGroupId}&jobId=${jobId}`;

		return withSpinner(this._http).post<any>(url, snapshotData).pipe(
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	createSnapShot(changeOrder: any): Observable<any>
	{
		return this.treeService.getChoiceCatalogIds(changeOrder.jobChangeOrderChoices || []).pipe(
			switchMap(changeOrderChoices => this.store.pipe(
				withLatestFrom(this.store.select(fromRoot.priceBreakdown),
					this.store.select(fromRoot.isSpecSalePending),
					this.store.select(fromLot.selectLot),
					this.store.select(fromChangeOrder.changeOrderPrimaryBuyer),
					this.store.select(fromChangeOrder.changeOrderCoBuyers)
				),
				map(([store, priceBreakdown, isSpecSalePending, selectLot, coPrimaryBuyer, coCoBuyers]) =>
				{
					const templates = store.contract.selectedTemplates.map(id =>
					{
						return store.contract.templates.find(t => t.templateId === id);
					}).sort((a, b) => a.displayOrder < b.displayOrder ? -1 : a.displayOrder > b.displayOrder ? 1 : 0);

					let template = store.contract.templates.find(t => t.templateId === 0);

					if (template)
					{
						templates.unshift(template);
					}

					let currentHouseSelections = templates.some(t => t.templateId === 0) ? getCurrentHouseSelections(store.scenario.tree.treeVersion.groups) : [];

					let salesAgreementNotes = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === "Public") && n.noteSubCategoryId !== 10).map(n => n.noteContent).join(", ") : '';
					let termsAndConditions = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === "Public") && n.noteSubCategoryId === 10).map(n => n.noteContent).join() : '';

					let jioSelections = {
						currentHouseSelections: currentHouseSelections,
						salesAgreementNotes: salesAgreementNotes
					};

					let decisionPoints = _.flatMap(store.scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

					let salesChangeOrderBuyers: Array<any> = [];

					const changeOrderBuyers = changeOrder.salesChangeOrderBuyers;

					if (changeOrderBuyers && changeOrderBuyers.length)
					{
						const salesAgreemenetBuyers = store.salesAgreement.buyers;
						const buyerIndexes = _.groupBy(changeOrderBuyers, 'sortKey');

						for (let buyerIndex in buyerIndexes)
						{
							let added = buyerIndexes[buyerIndex].find(b => b.action === 'Add');
							let removed = buyerIndexes[buyerIndex].find(b => b.action === 'Delete');
							let changed = buyerIndexes[buyerIndex].find(b => b.action === 'Change');

							if (added && removed && added.opportunityContactAssoc.id !== removed.opportunityContactAssoc.id)
							{
								if (added.isPrimaryBuyer)
								{
									//if we're adding a primary, and the removed has a different contactOpportunityAssoc ID, it must be a swap
									//TODO: What happens if they do a swap AND a name change?
									salesChangeOrderBuyers.push({
										new: added.buyerName,
										previous: removed.buyerName,
										action: 'Swap Buyer',
										isPrimaryBuyer: true
									});
								}
							}
							else
							{
								if (added)
								{
									salesChangeOrderBuyers.push({
										new: added.buyerName,
										previous: '',
										action: 'Add Buyer',
										isPrimaryBuyer: added.isPrimaryBuyer
									});
								}

								if (removed)
								{
									salesChangeOrderBuyers.push({
										new: '',
										previous: removed.buyerName,
										action: 'Remove Buyer',
										isPrimaryBuyer: removed.isPrimaryBuyer
									});
								}

								if (changed)
								{
									const sagBuyer = salesAgreemenetBuyers && salesAgreemenetBuyers.length
										? salesAgreemenetBuyers.find(x => x.opportunityContactAssoc.id === changed.opportunityContactAssoc.id)
										: null;
									let sagBuyerName = '';

									if (sagBuyer && sagBuyer.opportunityContactAssoc && sagBuyer.opportunityContactAssoc.contact)
									{
										const sagBuyerMiddleName = sagBuyer.opportunityContactAssoc.contact.middleName && sagBuyer.opportunityContactAssoc.contact.middleName.length
											? ` ${sagBuyer.opportunityContactAssoc.contact.middleName[0]}.`
											: '';

										// match d365 full name format - Last Name, First Name Middle Initial
										sagBuyerName = `${sagBuyer.opportunityContactAssoc.contact.lastName}, ${sagBuyer.opportunityContactAssoc.contact.firstName}${sagBuyerMiddleName}`;
									}

									salesChangeOrderBuyers.push({
										new: changed.buyerName,
										previous: sagBuyerName,
										action: 'Change Buyer',
										isPrimaryBuyer: changed.isPrimaryBuyer
									});
								}
							}
						}
					}

					let salesChangeOrderSelections = null;

					if (changeOrder.salesChangeOrderPriceAdjustments.length > 0 ||
						changeOrder.salesChangeOrderSalesPrograms.length > 0 ||
						salesChangeOrderBuyers.length > 0 ||
						changeOrder.salesChangeOrderTrusts.length > 0)
					{
						salesChangeOrderSelections = {
							salesChangeOrderTypeDescription: changeOrder.jobChangeOrderGroupDescription,
							salesChangeOrderPriceAdjustments: changeOrder.salesChangeOrderPriceAdjustments,
							salesChangeOrderSalesPrograms: changeOrder.salesChangeOrderSalesPrograms,
							salesChangeOrderBuyers: salesChangeOrderBuyers,
							salesChangeOrderTrusts: changeOrder.salesChangeOrderTrusts
						};
					}

					let constructionChangeOrderSelectionsDto = null;
					let planChangeOrderSelectionsDto = null;
					let nonStandardOptionSelectionsDto = null;
					let lotTransferSeletionsDto = null;

					switch (changeOrder.changeOrderTypeDescription)
					{
						case 'ChoiceAttribute':
						case 'Elevation':
						case 'Handing':
							let constructionChangeOrderSelections = getChangeOrderGroupSelections(store.scenario.tree.treeVersion.groups, <ChangeOrderChoice[]>changeOrderChoices);

							constructionChangeOrderSelectionsDto = {
								constructionChangeOrderSelections: constructionChangeOrderSelections,
								changeOrderChoices: <ChangeOrderChoice[]>changeOrderChoices
							};

							break;
						case 'Plan':
							let currentHouseSelectionsPoints = _.flatMap(currentHouseSelections, g => _.flatMap(g.subGroups, sg => sg.points)).filter(t => [1, 2].indexOf(t.dPointTypeId) === -1);

							planChangeOrderSelectionsDto = {
								plans: store.plan.plans,
								decisionPoints: decisionPoints,
								changeOrder: changeOrder,
								currentHouseSelectionsPoints: currentHouseSelectionsPoints
							};

							break;
						case 'NonStandard':
							nonStandardOptionSelectionsDto = changeOrder.jobChangeOrderNonStandardOptions;

							break;
						case 'HomesiteTransfer':
							let deletedLot = store.job.lot;
							let addedLot = store.lot.selectedLot;

							lotTransferSeletionsDto = { addedLot, deletedLot };

							break;
					}

					let lot = store.lot.selectedLot;
					let lotAddress = (lot.streetAddress1 ? lot.streetAddress1 : "") + " " + (lot.streetAddress2 ? lot.streetAddress2 : "") + "," + (lot.city ? lot.city : "") + "," + (lot.stateProvince ? lot.stateProvince : "") + " " + (lot.postalCode ? lot.postalCode : "");

					const inChangeOrderOrSpecSale = store.changeOrder.isChangingOrder || isSpecSalePending;
					let buyer = inChangeOrderOrSpecSale ? coPrimaryBuyer : store.salesAgreement.buyers.find(t => t.isPrimaryBuyer === true);
					const buyerContact = buyer && buyer.opportunityContactAssoc ? buyer.opportunityContactAssoc.contact : null;
					const currentBuyerName = buyerContact ? (`${buyerContact.firstName ? buyerContact.firstName : ''}${buyerContact.middleName ? ' ' + buyerContact.middleName : ''} ${buyerContact.lastName ? ' ' + buyerContact.lastName : ''}${buyerContact.suffix ? ' ' + buyerContact.suffix : ''}`) : '';

					const sagBuyers = store.salesAgreement.buyers.filter(t => t.isPrimaryBuyer === false);
					let coBuyerList = sagBuyers;

					if (inChangeOrderOrSpecSale)
					{
						const deletedBuyers = sagBuyers.filter(x => coCoBuyers.findIndex(b => b.opportunityContactAssoc.id === x.opportunityContactAssoc.id) < 0);

						coBuyerList = coCoBuyers.concat(deletedBuyers);
					}
					const currentCoBuyers = coBuyerList ? coBuyerList.map(b =>
					{
						return {
							firstName: b.opportunityContactAssoc.contact.firstName,
							lastName: b.opportunityContactAssoc.contact.lastName,
							middleName: b.opportunityContactAssoc.contact.middleName,
							suffix: b.opportunityContactAssoc.contact.suffix
						};
					}) : [];

					let salesConsultant = store.salesAgreement.consultants.length > 0 ? (store.salesAgreement.consultants[0].contact.firstName + " " + store.salesAgreement.consultants[0].contact.lastName) : "";
					let homePhone = "";
					let workPhone = "";
					let buyerCurrentAddress = "";

					if (buyer && buyer.opportunityContactAssoc.contact.phoneAssocs.length > 0)
					{
						buyer.opportunityContactAssoc.contact.phoneAssocs.forEach(t =>
						{
							if (t.isPrimary === true)
							{
								homePhone = t.phone.phoneNumber;
							}
							else if (t.isPrimary === false)
							{
								workPhone = t.phone.phoneNumber;
							}
						})
					}

					let buyerAddressAssoc = buyer && buyer.opportunityContactAssoc.contact.addressAssocs.length > 0 ? buyer.opportunityContactAssoc.contact.addressAssocs.find(t => t.isPrimary === true) : null;

					if (buyerAddressAssoc)
					{
						buyerCurrentAddress = (buyerAddressAssoc.address.address1 ? buyerAddressAssoc.address.address1 : "") + " " + (buyerAddressAssoc.address.address2 ? buyerAddressAssoc.address.address2 : "") + "," + (buyerAddressAssoc.address.city ? buyerAddressAssoc.address.city : "") + "," + (buyerAddressAssoc.address.stateProvince ? buyerAddressAssoc.address.stateProvince : "") + " " + (buyerAddressAssoc.address.postalCode ? buyerAddressAssoc.address.postalCode : "");
					}

					let planId = 0;
					let planName = '';

					if (store.plan.plans)
					{
						store.plan.plans.forEach(t =>
						{
							if (t.id === store.plan.selectedPlan)
							{
								planId = t.id;
								planName = t.salesName;
							}
						});
					}

					let financialCommunity = store.org.salesCommunity.financialCommunities[0];

					const elevationChoice = decisionPoints.find(t => t.dPointTypeId === 1)
						? decisionPoints.find(t => t.dPointTypeId === 1).choices.find(c => c.quantity > 0)
						: null;

					let changeOrderInformation: any = null;

					changeOrderInformation = {
						agreementId: store.salesAgreement.id,
						createdUtcDate: store.salesAgreement.createdUtcDate,
						approvedDate: store.salesAgreement.approvedDate,
						communityName: financialCommunity.name.trim() + " - " + financialCommunity.number,
						lotAddress: lotAddress,
						lotBlock: lot.lotBlock,
						phase: lot.salesPhase ? lot.salesPhase.salesPhaseName : '',
						unit: lot.unitNumber,
						garage: lot.handings.map(h => h.name),
						planName: planName,
						planId: planId,
						elevation: elevationChoice ? elevationChoice.label : '',
						buyerName: currentBuyerName,
						coBuyerName: '',
						currentCoBuyers: currentCoBuyers,
						homePhone: homePhone,
						workPhone: workPhone,
						email: buyer && buyer.opportunityContactAssoc.contact.emailAssocs.length > 0 ? buyer.opportunityContactAssoc.contact.emailAssocs.find(t => t.isPrimary === true).email.emailAddress : "",
						currentAddress: buyerCurrentAddress,
						salesConsultant: salesConsultant,
						salesAgreementNotes: salesAgreementNotes,
						changeOrderCreatedDate: new Date(changeOrder.createdUtcDate).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }),
						changeOrderId: changeOrder.id,
						changeOrderNumber: changeOrder.index.toString(),
						changeOrderType: changeOrder.changeOrderTypeDescription,
						changeOrderDescription: changeOrder.jobChangeOrderGroupDescription,
						changeOrderNotes: changeOrder.changeOrderNotes,
						changeOrderStatus: changeOrder.salesStatus,
						jobChangeOrderChoices: []
					};

					if (templates.length)
					{
						const salesAgreementStatus = store.salesAgreement.status;
						const changeOrderGroupId = changeOrder.id;
						const financialCommunityId = store.job.financialCommunityId;
						const primBuyer = isSpecSalePending && store.changeOrder.changeInput.buyers ? store.changeOrder.changeInput.buyers.find(b => b.isPrimaryBuyer) : store.salesAgreement.buyers.find(b => b.isPrimaryBuyer);
						const primaryBuyer = primBuyer ? primBuyer.opportunityContactAssoc.contact : new Contact();
						const coBuyers = store.salesAgreement.buyers ? store.salesAgreement.buyers.filter(b => !b.isPrimaryBuyer).sort((a, b) => a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? -1 : 1) : [] as Buyer[];
						const nsoSummary = store.job.changeOrderGroups ? store.job.changeOrderGroups.filter(x => x.jobChangeOrders.find(y => y.jobChangeOrderTypeDescription == "NonStandard") && (x.salesStatusDescription === "Pending")) : [];
						const salesAgreement = store.salesAgreement;

						const customerAddress = primaryBuyer.addressAssocs.find(a => a.isPrimary);
						const customerHomePhone = primaryBuyer.phoneAssocs.find(p => p.isPrimary);
						const customerWorkPhone = primaryBuyer.phoneAssocs.find(p => p.phone.phoneType === PhoneType.Business);
						const customerEmail = primaryBuyer.emailAssocs.find(e => e.isPrimary);

						const baseHousePrice = priceBreakdown.baseHouse ? priceBreakdown.baseHouse : 0;
						const lotPremium = priceBreakdown.homesite ? priceBreakdown.homesite : 0;
						const selectionsPrice = priceBreakdown.selections ? priceBreakdown.selections : 0;
						const totalHousePrice = priceBreakdown.totalPrice ? priceBreakdown.totalPrice : 0;
						const nonStandardPrice = priceBreakdown.nonStandardSelections ? priceBreakdown.nonStandardSelections : 0;
						const salesIncentivePrice = priceBreakdown.salesProgram !== null ? (-Math.abs(priceBreakdown.salesProgram) + priceBreakdown.priceAdjustments) : 0;
						const buyerClosingCosts = (priceBreakdown.closingIncentive || 0) + (priceBreakdown.closingCostAdjustment || 0);

						let jobBuyerHeaderInfo = {
							homePhone: customerHomePhone ? isNull(formatPhoneNumber(customerHomePhone.phone.phoneNumber), "") : "",
							workPhone: customerWorkPhone ? isNull(formatPhoneNumber(customerWorkPhone.phone.phoneNumber), "") : "",
							email: customerEmail ? isNull(customerEmail.email.emailAddress, "") : "",
							address: customerAddress && customerAddress.address ? isNull(customerAddress.address.address1, "").trim() + " " + isNull(customerAddress.address.address2, "").trim() : "",
							cityStateZip: customerAddress && customerAddress.address ? `${isNull(customerAddress.address.city, "").trim()}, ${isNull(customerAddress.address.stateProvince, "").trim()} ${isNull(customerAddress.address.postalCode, "").trim()}` : ""
						}

						let jobAgreementHeaderInfo = {
							agreementNumber: store.salesAgreement.salesAgreementNumber,
							agreementCreatedDate: new Date(store.salesAgreement.createdUtcDate).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }),
							agreementApprovedDate: !!store.salesAgreement.approvedDate ? (new Date(store.salesAgreement.approvedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null,
							agreementSignedDate: !!store.salesAgreement.signedDate ? (new Date(store.salesAgreement.signedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null,
							communityName: selectLot.selectedLot.financialCommunity.name,
							phaseName: !!store.job.lot.salesPhase && !!store.job.lot.salesPhase.salesPhaseName ? store.job.lot.salesPhase.salesPhaseName : "",
							garage: isNull(store.job.handing, ""),
							planName: store.job.plan.planSalesName,
							planID: store.job.plan.masterPlanNumber,
							elevation: store.job.jobPlanOptions && store.job.jobPlanOptions.find(x => x.jobOptionTypeName === "Elevation") ? store.job.jobPlanOptions.find(x => x.jobOptionTypeName === "Elevation").optionSalesName : '',
							lotBlock: isNull(store.job.lot.alternateLotBlock, ""),
							lotAddress: isNull(store.job.lot.streetAddress1, "").trim() + " " + isNull(store.job.lot.streetAddress2, "").trim(),
							cityStateZip: store.job.lot.city ? `${isNull(store.job.lot.city, "").trim()}, ${isNull(store.job.lot.stateProvince, "").trim()} ${isNull(store.job.lot.postalCode, "").trim()}` : "",
							lotBlockFullNumber: store.job.lot.lotBlock,
							salesAssociate: store.salesAgreement.consultants && store.salesAgreement.consultants.length ? store.salesAgreement.consultants[0].contact.firstName + " " + store.salesAgreement.consultants[0].contact.lastName :
								changeOrder.createdBy ? changeOrder.createdBy : "",
							salesDescription: changeOrder ? changeOrder.jobChangeOrderGroupDescription : ""
						}

						var envelopeInfo = {
							oldHanding: store.job.handing,
							newHanding: store.changeOrder && store.changeOrder.changeInput && store.changeOrder.changeInput.handing ? store.changeOrder.changeInput.handing.handing : null,
							buildType: store.job.lot ? store.job.lot.lotBuildTypeDesc : "",
							primaryBuyerName: isNull(store.salesAgreement.trustName, `${primaryBuyer.firstName ? primaryBuyer.firstName : ''}${primaryBuyer.middleName ? ' ' + primaryBuyer.middleName : ''} ${primaryBuyer.lastName ? ' ' + primaryBuyer.lastName : ''}${primaryBuyer.suffix ? ' ' + primaryBuyer.suffix : ''}`),
							primaryBuyerTrustName: isNull(store.salesAgreement.trustName && store.salesAgreement.trustName.length > 20 ? `${store.salesAgreement.trustName.substring(0, 20)}...` : store.salesAgreement.trustName, `${primaryBuyer.firstName ? primaryBuyer.firstName : ''}${primaryBuyer.middleName ? ' ' + primaryBuyer.middleName : ''} ${primaryBuyer.lastName ? ' ' + primaryBuyer.lastName : ''}${primaryBuyer.suffix ? ' ' + primaryBuyer.suffix : ''}`),
							salesAgreementNotes: salesAgreementNotes,
							termsAndConditions: termsAndConditions,
							coBuyers: coBuyers ? coBuyers.map(result =>
							{
								return {
									firstName: result.opportunityContactAssoc.contact.firstName,
									lastName: result.opportunityContactAssoc.contact.lastName,
									middleName: result.opportunityContactAssoc.contact.middleName,
									suffix: result.opportunityContactAssoc.contact.suffix
								};
							}) : [],
							nsoSummary: this.getNsoOptionDetailsData(nsoSummary, store.job.jobNonStandardOptions),
							closingCostInformation: this.getProgramDetails(store.salesAgreement.programs, store.job.changeOrderGroups, 'BuyersClosingCost')
								.concat(store.salesAgreement.priceAdjustments ? store.salesAgreement.priceAdjustments.filter(a => a.priceAdjustmentType === 'ClosingCost')
									.map(a =>
									{
										return { salesProgramDescription: '', amount: a.amount, name: 'Price Adjustment', salesProgramId: 0 };
									}) : []),
							salesIncentiveInformation: this.getProgramDetails(store.salesAgreement.programs, store.job.changeOrderGroups, 'DiscountFlatAmount')
								.concat(store.salesAgreement.priceAdjustments ? store.salesAgreement.priceAdjustments.filter(a => a.priceAdjustmentType === 'Discount')
									.map(a =>
									{
										return { salesProgramDescription: '', amount: a.amount, name: 'Price Adjustment', salesProgramId: 0 };
									}) : []),
							baseHousePrice: baseHousePrice,
							lotPremium: lotPremium,
							selectionsPrice: selectionsPrice,
							totalHousePrice: totalHousePrice,
							nonStandardPrice: nonStandardPrice,
							salesIncentivePrice: salesIncentivePrice,
							buyerClosingCosts: buyerClosingCosts,
							jobBuyerHeaderInfo: jobBuyerHeaderInfo,
							jobAgreementHeaderInfo: jobAgreementHeaderInfo
						};

						let mappedTemplates = templates.map(t =>
						{
							return { templateId: t.templateId, displayOrder: templates.indexOf(t) + 1, documentName: t.documentName, templateTypeId: t.templateTypeId };
						});

						let planChangeOrderSelections = null;
						let constructionChangeOrderSelections = [];
						let nonStandardChangeOrderSelections = [];
						let lotTransferChangeOrderSelections = null;

						if (constructionChangeOrderSelectionsDto)
						{
							let jobChangeOrderChoices = this.getConstructionChangeOrderPdfData(constructionChangeOrderSelectionsDto.changeOrderChoices);

							changeOrderInformation.jobChangeOrderChoices = jobChangeOrderChoices;

							constructionChangeOrderSelections = constructionChangeOrderSelectionsDto.constructionChangeOrderSelections;
						}
						else if (planChangeOrderSelectionsDto)
						{
							planChangeOrderSelections = this.getPlanChangeOrderPdfData(planChangeOrderSelectionsDto.plans, planChangeOrderSelectionsDto.decisionPoints, planChangeOrderSelectionsDto.changeOrder.jobChangeOrderPlans, planChangeOrderSelectionsDto.changeOrder.jobChangeOrderChoices, planChangeOrderSelectionsDto.currentHouseSelectionsPoints);
						}
						else if (nonStandardOptionSelectionsDto)
						{
							nonStandardChangeOrderSelections = this.getNonStandardChangeOrderPdfData(nonStandardOptionSelectionsDto);
						}
						else if (lotTransferSeletionsDto)
						{
							lotTransferChangeOrderSelections = this.getLotTransferPdfData(lotTransferSeletionsDto.addedLot, lotTransferSeletionsDto.deletedLot);
						}

						const currentSnapshot = {
							templates: mappedTemplates,
							jioSelections: jioSelections,
							financialCommunityId: financialCommunityId,
							jobId: store.job.id,
							changeOrderGroupId: changeOrderGroupId,
							salesAgreementNumber: salesAgreement.salesAgreementNumber,
							salesAgreementStatus: salesAgreementStatus,
							constructionChangeOrderSelections: constructionChangeOrderSelections,
							salesChangeOrderSelections: salesChangeOrderSelections,
							planChangeOrderSelections: planChangeOrderSelections,
							nonStandardChangeOrderSelections: nonStandardChangeOrderSelections,
							lotTransferChangeOrderSelections: lotTransferChangeOrderSelections ? { lotDtos: lotTransferChangeOrderSelections } : null,
							changeOrderInformation: changeOrderInformation,
							envelopeInfo: envelopeInfo
						}

						return currentSnapshot;
					}
				}),
				take(1)
			))
		);
	}

	getProgramDetails(programs: Array<SalesAgreementProgram>, changeOrders: Array<ChangeOrderGroup>, salesProgramType: string): any[]
	{
		let mappedPrograms = _.cloneDeep(programs) || [];
		let clonedCOs = _.cloneDeep(changeOrders.filter(co => co.salesStatusDescription !== 'Withdrawn' && co.salesStatusDescription !== 'Resolved'))
			.reverse();
		let coPrograms = _.flatten(clonedCOs.map(cog =>
		{
			return _.flatten(cog.jobChangeOrders.filter(co => co.jobSalesChangeOrderSalesPrograms && co.jobSalesChangeOrderSalesPrograms.length !== 0)
				.map(co => co.jobSalesChangeOrderSalesPrograms.filter(p => p.action === 'Add' && p.salesProgramType === salesProgramType)
					.map(p =>
					{
						let removed = co.jobSalesChangeOrderSalesPrograms.find(r => r.action === 'Delete' && r.salesProgramId === p.salesProgramId);

						if (removed)
						{
							p.amount -= removed.amount;
						}
						return p;
					}))
				.filter(cop => cop.length !== 0)
			).map(sp =>
			{
				return {
					approved: cog.salesStatusDescription === 'Approved' && cog.constructionStatusDescription === 'Approved',
					salesAgreementProgram: new SalesAgreementProgram({ amount: sp.amount, salesProgram: { name: sp.name, salesProgramType: sp.salesProgramType }, salesProgramDescription: sp.salesProgramDescription, salesProgramId: sp.salesProgramId })
				};
			});
		}));

		mappedPrograms.forEach(p =>
		{
			p.amount -= _.sum(coPrograms.filter(cop => cop.approved && cop.salesAgreementProgram.salesProgramId === p.salesProgramId).map(cop => cop.salesAgreementProgram.amount));

			for (let cog of clonedCOs)
			{
				var deleted = _.flatten(cog.jobChangeOrders.filter(co => co.jobSalesChangeOrderSalesPrograms.length !== 0)
					.map(co => co.jobSalesChangeOrderSalesPrograms))
					.find(cop => cop.action === 'Delete' && cop.salesProgramId === p.salesProgramId);

				if (deleted)
				{
					p.salesProgramDescription = deleted.salesProgramDescription;

					break;
				}
			}

		});

		return mappedPrograms.filter(p => p.salesProgram.salesProgramType === salesProgramType && p.amount > 0)
			.concat(coPrograms.map(p => p.salesAgreementProgram))
			.map(sap => { return { salesProgramDescription: sap.salesProgramDescription, amount: sap.amount, name: sap.salesProgram.name, salesProgramId: sap.salesProgramId }; });
	}

	getSnapShot(jobId: number, changeOrderId: number): Observable<any>
	{
		const entity = `GetSnapShot(changeOrderId=${changeOrderId},jobId=${jobId})`;
		const url = `${environment.apiUrl}${entity}`;
		const headers = new HttpHeaders({
			'Accept': 'application/json'
		});

		return this._http.get(url, { headers: headers }).pipe(
			map(response =>
			{
				return response as any;
			}),
			catchError(error =>
			{
				if (error.status === 404)
				{
					return of(null);
				}

				console.error(error);

				return _throw(error);
			})
		);
	}

	getPDFFromStorageByteArray(changeOrderId: string, jobId: number): Observable<string>
	{
		const action = `GetPDFFromStorageByteArray(changeOrderId='${changeOrderId}', jobId=${jobId})`;
		const url = `${environment.apiUrl}${action}`;
		const headers = new HttpHeaders({
			'Content-Type': 'application/json',
			'Accept': 'application/pdf'
		});

		return withSpinner(this._http).get(url, { headers: headers, responseType: "blob" }).pipe(
			map(response =>
			{
				return window.URL.createObjectURL(response);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	compareSnapshots(jobId: number, changeOrder: any): Observable<any>
	{
		const lockedSnapshot = this.getSnapShot(jobId, changeOrder.id);
		const currentSnapshot = this.createSnapShot(changeOrder);

		return currentSnapshot.pipe(
			combineLatest(lockedSnapshot),
			map(([currentSnapshot, lockedSnapshot]) =>
			{
				if (lockedSnapshot)
				{
					delete (lockedSnapshot['@odata.context']);
				}

				if (JSON.stringify(lockedSnapshot) !== JSON.stringify(currentSnapshot))
				{
					return currentSnapshot;
				}
				else
				{
					return null;
				}
			})
		)
	}

	getEnvelope(jobId: number, changeOrderId: number, approvedDate: Date, signedDate: Date)
	{
		return this.getSnapShot(jobId, changeOrderId).pipe(
			switchMap(lockedSnapshot =>
			{
				if (lockedSnapshot)
				{
					delete (lockedSnapshot['@odata.context']);

					var clonedSnapshot = _.cloneDeep(lockedSnapshot);

					clonedSnapshot.envelopeInfo.jobAgreementHeaderInfo.agreementApprovedDate = approvedDate ? new Date(approvedDate.toString().replace(/-/g, '\/').replace(/T.+/, '')).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null;
					clonedSnapshot.envelopeInfo.jobAgreementHeaderInfo.agreementSignedDate = signedDate ? new Date(signedDate.toString().replace(/-/g, '\/').replace(/T.+/, '')).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null;

					if (JSON.stringify(lockedSnapshot) !== JSON.stringify(clonedSnapshot))
					{
						return this.getLockedMergeFields(jobId).pipe(
							switchMap(lockedMergeFields =>
							{
								return this.saveSnapshot(clonedSnapshot, jobId, changeOrderId).pipe(
									map(x =>
									{
										return { lockedMergeFields: lockedMergeFields };
									})
								);
							}),
							switchMap((data) =>
							{
								return this.createEnvelope([...data.lockedMergeFields.customMergeFields, ...data.lockedMergeFields.systemMergeFields], clonedSnapshot.jioSelections, clonedSnapshot.templates.filter(t => t.templateId === 0), clonedSnapshot.financialCommunityId, clonedSnapshot.salesAgreementNumber,
									clonedSnapshot.salesAgreementStatus, clonedSnapshot.envelopeInfo, clonedSnapshot.jobId, clonedSnapshot.changeOrderGroupId, clonedSnapshot.constructionChangeOrderSelections,
									clonedSnapshot.salesChangeOrderSelections, clonedSnapshot.planChangOrderSelections, clonedSnapshot.nonStandardChangeOrderSelections, clonedSnapshot.lotTransferSelections,
									clonedSnapshot.changeOrderInformation).pipe(
										map((res) =>
										{
											if (res)
											{
												return true;
											}
											else
											{
												return false;
											}
										})
									);
							})
						);
					}
					else
					{
						return of(true);
					}
				}
				else
				{
					return of(false);
				}
			})
		);
	}

	getNsoOptionDetailsData(nsoSummary: any, jobNonStandardOptions: any)
	{
		let nsoDetails = nsoSummary ? nsoSummary.map(result =>
		{
			return {
				nonStandardOptionName: result.jobChangeOrders[0].jobChangeOrderNonStandardOptions[0].nonStandardOptionName,
				nonStandardOptionDescription: result.jobChangeOrders[0].jobChangeOrderNonStandardOptions[0].nonStandardOptionDescription,
				nonStandardOptionQuantity: result.jobChangeOrders[0].jobChangeOrderNonStandardOptions[0].qty,
				nonStandardOptionUnitPrice: result.jobChangeOrders[0].jobChangeOrderNonStandardOptions[0].unitPrice,
				nonStandardOptionAction: result.jobChangeOrders[0].jobChangeOrderNonStandardOptions[0].action
			};
		}) : [];

		let jobNsoDetails = jobNonStandardOptions ? jobNonStandardOptions.map(result =>
		{
			return {
				nonStandardOptionName: result.name,
				nonStandardOptionDescription: result.description,
				nonStandardOptionQuantity: result.quantity,
				nonStandardOptionUnitPrice: result.unitPrice,
				nonStandardOptionAction: 'Add'
			};
		}) : [];

		return [...nsoDetails, ...jobNsoDetails];
	}
}
