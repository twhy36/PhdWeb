import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { combineLatest, switchMap, withLatestFrom, exhaustMap, map, take } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { never } from 'rxjs/observable/never';
import { from } from 'rxjs/observable/from';

import {
	Buyer, Contact, PhoneType, ESignEnvelope, ESignStatusEnum, ESignTypeEnum, ChangeOrderGroup,
	ChangeOrderChoice, formatPhoneNumber
} from 'phd-common';

import * as fromRoot from '../reducers';
import
{
	LoadError, TemplatesLoaded, ContractActionTypes, CreateEnvelope,
	EnvelopeCreated, EnvelopeError, AddRemoveSelectedTemplate, FinancialCommunityESignLoaded, 
	LoadFinancialCommunityESign, CreateTerminationEnvelope, TerminationEnvelopeCreated, 
	TerminationEnvelopeError, SetChangeOrderTemplates
} from './actions';
import { ContractService } from '../../core/services/contract.service';
import { ChangeOrderService } from '../../core/services/change-order.service';
import { tryCatch } from '../error.action';
import { getCurrentHouseSelections, convertMapToMergeFieldDto, getChangeOrderGroupSelections } from '../../shared/classes/merge-field-utils.class';
import { ChangeOrderEnvelopeCreated, ESignEnvelopesLoaded } from '../actions';
import { isNull } from "../../shared/classes/string-utils.class";
import * as fromLot from '../lot/reducer';
import * as fromScenario from '../scenario/reducer';
import * as fromChangeOrder from '../change-order/reducer';
import * as _ from 'lodash';
import { MergeFieldData } from '../../shared/models/contract.model';

@Injectable()
export class ContractEffects
{
	@Effect()
	templatesLoaded: Observable<Action> = this.actions$.pipe(
		ofType<TemplatesLoaded>(ContractActionTypes.TemplatesLoaded),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				if (store.salesAgreement.status === "Pending")
				{
					return of(new AddRemoveSelectedTemplate(0, false, ESignTypeEnum.SalesAgreement));
				}
				else if (store.changeOrder.isChangingOrder)
				{
					return of(new SetChangeOrderTemplates(true));
				}

				return new Observable<never>();
			}),
		), LoadError, "Error loading templates!!")
	);

	@Effect()
	createEnvelope$: Observable<Action> = this.actions$.pipe(
		ofType<CreateEnvelope>(ContractActionTypes.CreateEnvelope),
		withLatestFrom(this.store,
			this.store.select(fromRoot.priceBreakdown),
			this.store.select(fromRoot.isSpecSalePending),
			this.store.select(fromLot.selectLot),
			this.store.select(fromScenario.elevationDP),
			this.store.select(fromChangeOrder.changeOrderPrimaryBuyer),
			this.store.select(fromChangeOrder.changeOrderCoBuyers)
		),
		tryCatch(source => source.pipe(
			switchMap(([action, store, priceBreakdown, isSpecSalePending, selectLot, elevationDP, coPrimaryBuyer, coCoBuyers]) =>
			{
				const isPreview = action.isPreview;
				// get selected templates and sort by display order
				const templates = store.contract.selectedTemplates.length ? store.contract.selectedTemplates.map(id =>
				{
					return store.contract.templates.find(t => t.templateId === id);
				}).sort((a, b) => a.displayOrder < b.displayOrder ? -1 : a.displayOrder > b.displayOrder ? 1 : 0) : [{ displayName: "JIO", displayOrder: 2, documentName: "JIO", templateId: 0, templateTypeId: 4, marketId: 0, version: 0 }];

				let salesAgreementNotes = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === "Public") && n.noteSubCategoryId !== 10).map(n => n.noteContent).join(", ") : '';
				let termsAndConditions = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === "Public") && n.noteSubCategoryId === 10).map(n => n.noteContent).join() : '';

				const currentHouseSelections = templates.some(t => t.templateId === 0) ? getCurrentHouseSelections(store.scenario.tree.treeVersion.groups) : [];

				let jioSelections = {
					currentHouseSelections: currentHouseSelections,
					salesAgreementNotes: salesAgreementNotes
				};

				if (templates.length)
				{
					const salesAgreementStatus = store.salesAgreement.status;
					const marketId = store.org.salesCommunity.market.id;
					const financialCommunityId = store.job.financialCommunityId;
					const salesAgreement = store.salesAgreement;
					const primBuyer = isSpecSalePending && store.changeOrder.changeInput.buyers ? store.changeOrder.changeInput.buyers.find(b => b.isPrimaryBuyer) : store.salesAgreement.buyers.find(b => b.isPrimaryBuyer);
					const primaryBuyer = primBuyer ? primBuyer.opportunityContactAssoc.contact : new Contact();
					const coBuyers = isSpecSalePending && store.changeOrder.changeInput.buyers ? store.changeOrder.changeInput.buyers.filter(b => !b.isPrimaryBuyer).sort((a, b) => a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? -1 : 1) : store.salesAgreement.buyers ? store.salesAgreement.buyers.filter(b => !b.isPrimaryBuyer).sort((a, b) => a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? -1 : 1) : [] as Buyer[];
					const nsoSummary = store.job.changeOrderGroups ? store.job.changeOrderGroups.filter(x => x.jobChangeOrders.find(y => y.jobChangeOrderTypeDescription == "NonStandard") && (x.salesStatusDescription === "Pending")) : [];

					const customerAddress = primaryBuyer.addressAssocs.find(a => a.isPrimary);
					const customerHomePhone = primaryBuyer.phoneAssocs.find(p => p.isPrimary);
					const customerWorkPhone = primaryBuyer.phoneAssocs.find(p => p.phone.phoneType === PhoneType.Business);
					const customerEmail = primaryBuyer.emailAssocs.find(e => e.isPrimary);

					// Fetch price break down information

					const baseHousePrice = priceBreakdown.baseHouse || 0;
					const lotPremium = priceBreakdown.homesite || 0;
					const selectionsPrice = priceBreakdown.selections || 0;
					const totalHousePrice = priceBreakdown.totalPrice || 0;
					const nonStandardPrice = priceBreakdown.nonStandardSelections || 0;
					const salesIncentivePrice = priceBreakdown.salesProgram !== null ? (-Math.abs(priceBreakdown.salesProgram) + priceBreakdown.priceAdjustments) : 0;
					const buyerClosingCosts = (priceBreakdown.closingIncentive || 0) + (priceBreakdown.closingCostAdjustment || 0);

					const jio = store.job.changeOrderGroups[store.job.changeOrderGroups.length - 1];

					const createdDate = store.salesAgreement.createdUtcDate || jio.createdUtcDate;

					let jobBuyerHeaderInfo = {
						homePhone: customerHomePhone ? isNull(formatPhoneNumber(customerHomePhone.phone.phoneNumber), "") : "",
						workPhone: customerWorkPhone ? isNull(formatPhoneNumber(customerWorkPhone.phone.phoneNumber), "") : "",
						email: customerEmail ? isNull(customerEmail.email.emailAddress, "") : "",
						address: customerAddress && customerAddress.address ? isNull(customerAddress.address.address1, "").trim() + " " + isNull(customerAddress.address.address2, "").trim() : "",
						cityStateZip: customerAddress && customerAddress.address ? `${isNull(customerAddress.address.city, "").trim()}, ${isNull(customerAddress.address.stateProvince, "").trim()} ${isNull(customerAddress.address.postalCode, "").trim()}` : ""
					}

					let jobAgreementHeaderInfo = {
						agreementNumber: store.salesAgreement.salesAgreementNumber,
						agreementCreatedDate: new Date(createdDate).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }),
						agreementApprovedDate: !!store.salesAgreement.approvedDate ? (new Date(store.salesAgreement.approvedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null,
						agreementSignedDate: !!store.salesAgreement.signedDate ? (new Date(store.salesAgreement.signedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null,
						communityName: selectLot.selectedLot.financialCommunity.name,
						communityMarketingName: store.org.salesCommunity.name,
						phaseName: !!store.job.lot.salesPhase && !!store.job.lot.salesPhase.salesPhaseName ? store.job.lot.salesPhase.salesPhaseName : "",
						garage: isNull(store.job.handing, ""),
						planName: store.job.plan.planSalesName,
						planID: store.job.plan.masterPlanNumber,
						elevation: elevationDP && elevationDP.choices.find(c => c.quantity > 0) ? elevationDP.choices.find(c => c.quantity > 0).label : "",
						lotBlock: isNull(store.job.lot.alternateLotBlock, ""),
						lotAddress: isNull(store.job.lot.streetAddress1, "").trim() + " " + isNull(store.job.lot.streetAddress2, "").trim(),
						cityStateZip: store.job.lot.city ? `${isNull(store.job.lot.city, "").trim()}, ${isNull(store.job.lot.stateProvince, "").trim()} ${isNull(store.job.lot.postalCode, "").trim()}` : "",
						lotBlockFullNumber: store.job.lot.lotBlock,
						salesAssociate: store.salesAgreement.consultants && store.salesAgreement.consultants.length ? store.salesAgreement.consultants[0].contact.firstName + " " + store.salesAgreement.consultants[0].contact.lastName :
							jio && jio.contact ? jio.contact.displayName : "",
						salesDescription: jio ? jio.jobChangeOrderGroupDescription : ""
					}

					var envelopeInfo = {
						oldHanding: store.job.handing,
						newHanding: store.changeOrder && store.changeOrder.changeInput && store.changeOrder.changeInput.handing ? store.changeOrder.changeInput.handing.handing : null,
						buildType: store.job.lot ? store.job.lot.lotBuildTypeDesc : "",
						primaryBuyerName: isNull(store.changeOrder && store.changeOrder.changeInput ? store.changeOrder.changeInput.trustName : null, `${primaryBuyer.firstName ? primaryBuyer.firstName : ''}${primaryBuyer.middleName ? ' ' + primaryBuyer.middleName : ''} ${primaryBuyer.lastName ? ' ' + primaryBuyer.lastName : ''}${primaryBuyer.suffix ? ' ' + primaryBuyer.suffix : ''}`),
						primaryBuyerTrustName: isNull(store.changeOrder && store.changeOrder.changeInput && store.changeOrder.changeInput.trustName && store.changeOrder.changeInput.trustName.length > 20 ? `${store.changeOrder.changeInput.trustName.substring(0, 20)}...` : store.changeOrder && store.changeOrder.changeInput ? store.changeOrder.changeInput.trustName : null, `${primaryBuyer.firstName ? primaryBuyer.firstName : ''}${primaryBuyer.middleName ? ' ' + primaryBuyer.middleName : ''} ${primaryBuyer.lastName ? ' ' + primaryBuyer.lastName : ''}${primaryBuyer.suffix ? ' ' + primaryBuyer.suffix : ''}`),
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
						nsoSummary: this.contractService.getNsoOptionDetailsData(nsoSummary, store.job.jobNonStandardOptions),
						closingCostInformation: this.contractService.getProgramDetails(store.salesAgreement.programs, store.job.changeOrderGroups, 'BuyersClosingCost')
							.concat(store.salesAgreement.priceAdjustments ? store.salesAgreement.priceAdjustments.filter(a => a.priceAdjustmentType === 'ClosingCost')
								.map(a =>
								{
									return { salesProgramDescription: '', amount: a.amount, name: 'Price Adjustment', salesProgramId: 0 };
								}) : []),
						salesIncentiveInformation: this.contractService.getProgramDetails(store.salesAgreement.programs, store.job.changeOrderGroups, 'DiscountFlatAmount')
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

					// Create a snapshot

					let planChangeOrderSelections = null;
					let constructionChangeOrderSelections = [];
					let nonStandardChangeOrderSelections = [];
					let lotTransferChangeOrderSelections = null;
					let mappedTemplates = templates.map(t =>
					{
						return { templateId: t.templateId, displayOrder: templates.indexOf(t) + 1, documentName: t.documentName, templateTypeId: t.templateTypeId };
					});

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

					let lot = store.lot.selectedLot;
					let lotAddress = (lot.streetAddress1 ? lot.streetAddress1 : "") + " " + (lot.streetAddress2 ? lot.streetAddress2 : "") + "," + (lot.city ? lot.city : "") + "," + (lot.stateProvince ? lot.stateProvince : "") + " " + (lot.postalCode ? lot.postalCode : "");

					const inChangeOrderOrSpecSale = store.changeOrder.isChangingOrder || isSpecSalePending;
					let buyer = inChangeOrderOrSpecSale ? coPrimaryBuyer : store.salesAgreement.buyers.find(t => t.isPrimaryBuyer === true);
					const buyerContact = buyer && buyer.opportunityContactAssoc ? buyer.opportunityContactAssoc.contact : null;
					const currentBuyerName = buyerContact ? `${buyerContact.firstName ? buyerContact.firstName : ''}${buyerContact.middleName ? ' ' + buyerContact.middleName : ''} ${buyerContact.lastName ? ' ' + buyerContact.lastName : ''}${buyerContact.suffix ? ' ' + buyerContact.suffix : ''}` : '';

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

					if (buyer && buyer.opportunityContactAssoc && buyer.opportunityContactAssoc.contact.phoneAssocs.length > 0)
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

					let financialCommunity = store.org.salesCommunity.financialCommunities[0];

					let decisionPoints = _.flatMap(store.scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

					const elevationChoice = decisionPoints.find(t => t.dPointTypeId === 1)
						? decisionPoints.find(t => t.dPointTypeId === 1).choices.find(c => c.quantity > 0)
						: null;

					let jobChangeOrderGroups = store.job.changeOrderGroups.map(o =>
					{
						return {
							id: o.id,
							createdUtcDate: o.createdUtcDate,
							salesStatus: o.salesStatusDescription,
							index: o.changeOrderGroupSequence ? (o.changeOrderGroupSequence + o.changeOrderGroupSequenceSuffix) : 0,
							changeOrderTypeDescription: o.jobChangeOrders.length ? o.jobChangeOrders[0].jobChangeOrderTypeDescription : '',
							jobChangeOrderGroupDescription: o.jobChangeOrderGroupDescription,
							changeOrderNotes: o.note ? o.note.noteContent : '',
							jobChangeOrderChoices: o.jobChangeOrders.length ? _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderChoices)) : null,
							envelopeId: o.envelopeId
						}
					});

					jobChangeOrderGroups.sort((a: any, b: any) =>
					{
						return new Date(a.createdUtcDate).getTime() - new Date(b.createdUtcDate).getTime();
					});

					// Fetches SalesJIO, SpecJIO and Spec Customer JIO since they will be the first on the agreement. Not checking for pending since SpecJIO would be approved at this point.
					let activeChangeOrderGroup = jobChangeOrderGroups[jobChangeOrderGroups.length - 1];

					let currentChangeOrderChoices = store.changeOrder && store.changeOrder.currentChangeOrder
						? _.flatten(store.changeOrder.currentChangeOrder.jobChangeOrders.map(t => t.jobChangeOrderChoices))
						: [];
					let constructionChangeOrderSelectionsDto = null;

					let customerSelections = getChangeOrderGroupSelections(store.scenario.tree.treeVersion.groups, <ChangeOrderChoice[]>currentChangeOrderChoices);

					constructionChangeOrderSelectionsDto = {
						constructionChangeOrderSelections: customerSelections,
						changeOrderChoices: currentChangeOrderChoices
					};

					let jobChangeOrderChoices = this.contractService.getConstructionChangeOrderPdfData(<ChangeOrderChoice[]>currentChangeOrderChoices);

					constructionChangeOrderSelections = constructionChangeOrderSelectionsDto.constructionChangeOrderSelections;

					let changeOrderInformation = {
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
						changeOrderCreatedDate: new Date(activeChangeOrderGroup.createdUtcDate).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }),
						changeOrderId: activeChangeOrderGroup.id,
						changeOrderNumber: activeChangeOrderGroup.index.toString(),
						changeOrderType: activeChangeOrderGroup.changeOrderTypeDescription,
						changeOrderDescription: activeChangeOrderGroup.jobChangeOrderGroupDescription,
						changeOrderNotes: activeChangeOrderGroup.changeOrderNotes,
						changeOrderStatus: activeChangeOrderGroup.salesStatus,
						jobChangeOrderChoices: jobChangeOrderChoices
					};

					const currentSnapshot = {
						templates: mappedTemplates,
						jioSelections: jioSelections,
						financialCommunityId: financialCommunityId,
						jobId: store.job.id,
						changeOrderGroupId: activeChangeOrderGroup.id,
						salesAgreementNumber: salesAgreement.salesAgreementNumber,
						salesAgreementStatus: salesAgreementStatus,
						constructionChangeOrderSelections: constructionChangeOrderSelections,
						salesChangeOrderSelections: null,
						planChangeOrderSelections: planChangeOrderSelections,
						nonStandardChangeOrderSelections: nonStandardChangeOrderSelections,
						lotTransferChangeOrderSelections: lotTransferChangeOrderSelections ? { lotDtos: lotTransferChangeOrderSelections } : null,
						changeOrderInformation: changeOrderInformation,
						envelopeInfo: envelopeInfo
					}

					const mergeFieldData = salesAgreementStatus != 'Pending' ? this.contractService.getLockedMergeFields(store.job.id) : of(new MergeFieldData());
					const customMergeFields = salesAgreementStatus == 'Pending' ? this.contractService.getCustomMergeFields(marketId, financialCommunityId) : of<Map<string, string>>(null);
					const lockedSnapshot = this.contractService.getSnapShot(store.job.id, activeChangeOrderGroup.id);

					const systemMergeFields = salesAgreementStatus == 'Pending' ? this.store.pipe(select(fromRoot.systemMergeFields)) : of<Map<string, string>>(null);
					const changeOrderData = new ChangeOrderGroup(store.changeOrder.currentChangeOrder);

					return customMergeFields.pipe(
						combineLatest(mergeFieldData, systemMergeFields, lockedSnapshot),
						map(([customMergeFields, mergeFieldData, systemMergeFields, lockedSnapshot]) =>
						{
							return { customMergeFields, mergeFieldData, systemMergeFields, lockedSnapshot, jioSelections: jioSelections, templates: mappedTemplates, financialCommunityId: financialCommunityId, salesAgreement: salesAgreement, changeOrder: changeOrderData, envelopeInfo: envelopeInfo, isPreview: isPreview, jobId: store.job.id, changeOrderGroupId: activeChangeOrderGroup.id, envelopeId: activeChangeOrderGroup.envelopeId, currentSnapshot: currentSnapshot };
						}),
						take(1)
					);
				}
				else
				{
					throw 'No Documents Selected';
				}
			}),
			exhaustMap(data =>
			{
				//save the merge fields for later user if this envelope is intended for
				//signing
				if (data.isPreview || data.salesAgreement.status !== 'Pending')
				{
					return of(data);
				}
				else
				{
					return this.contractService.lockMergeFields(data.customMergeFields, data.systemMergeFields, data.jobId).pipe(
						map(() => data)
					);
				}
			}),
			exhaustMap(data =>
			{
				const convertedCustomMergeFields = data.mergeFieldData && data.mergeFieldData.customMergeFields ? data.mergeFieldData.customMergeFields : data.customMergeFields ? convertMapToMergeFieldDto(data.customMergeFields) : [];
				const convertedSystemMergeFields = data.mergeFieldData && data.mergeFieldData.systemMergeFields ? data.mergeFieldData.systemMergeFields : data.systemMergeFields ? convertMapToMergeFieldDto(data.systemMergeFields) : [];

				if (data.isPreview)
				{
					return this.contractService.createEnvelope([...convertedCustomMergeFields, ...convertedSystemMergeFields], data.jioSelections, data.templates, data.financialCommunityId, data.salesAgreement.salesAgreementNumber, data.salesAgreement.status, data.envelopeInfo, data.jobId, data.changeOrderGroupId, data.currentSnapshot.constructionChangeOrderSelections, null, null, null, null, data.currentSnapshot.changeOrderInformation, data.isPreview).pipe(
						map(envelopeId =>
						{
							return { envelopeId, changeOrder: data.changeOrder, isPreview: data.isPreview };
						})
					);
				}
				else
				{
					if (data.lockedSnapshot)
					{
						delete (data.lockedSnapshot['@odata.context']);
					}

					if (data.lockedSnapshot && JSON.stringify(data.lockedSnapshot) === JSON.stringify(data.currentSnapshot))
					{
						return of({ envelopeId: data.envelopeId, changeOrder: data.changeOrder, isPreview: data.isPreview });
					}
					else
					{
						return this.contractService.saveSnapshot(data.currentSnapshot, data.jobId, data.changeOrderGroupId).pipe(
							switchMap(() =>
								this.contractService.createEnvelope([...convertedCustomMergeFields, ...convertedSystemMergeFields], data.jioSelections, data.templates, data.financialCommunityId, data.salesAgreement.salesAgreementNumber, data.salesAgreement.status, data.envelopeInfo, data.jobId, data.changeOrderGroupId, data.currentSnapshot.constructionChangeOrderSelections, null, null, null, null, data.currentSnapshot.changeOrderInformation, data.isPreview)),
							map(envelopeId =>
							{
								return { envelopeId, changeOrder: data.changeOrder, isPreview: data.isPreview };
							}
							));
					}
				}
			}),
			switchMap(data =>
			{
				let eSignEnvelope: ESignEnvelope;

				// Create a ESignEnvelope if not preview
				if (!data.isPreview)
				{
					if (data.changeOrder.eSignEnvelopes && data.changeOrder.eSignEnvelopes.some(e => e.eSignStatusId === ESignStatusEnum.Created))
					{
						eSignEnvelope = new ESignEnvelope(data.changeOrder.eSignEnvelopes.find(e => e.eSignStatusId === ESignStatusEnum.Created));
						eSignEnvelope.envelopeGuid = data.envelopeId;

						return this.changeOrderService.updateESignEnvelope(eSignEnvelope).pipe(
							map((eSignEnvelope) =>
							{
								return { eSignEnvelope, changeOrder: data.changeOrder };
							})
						);
					}
					else
					{
						eSignEnvelope = {
							envelopeGuid: data.envelopeId,
							eSignStatusId: ESignStatusEnum.Created,
							eSignTypeId: ESignTypeEnum.SalesAgreement,
							edhChangeOrderGroupId: data.changeOrder.id
						};

						// Make sure we have a edhChangeOrderGroupId before calling createEsignEnvelope. Specs will not have an Id when coming from portal as store.changeOrder.currentChangeOrder is not used.
						if (eSignEnvelope.edhChangeOrderGroupId)
						{
							return this.changeOrderService.createESignEnvelope(eSignEnvelope).pipe(
								map((eSignEnvelope) =>
								{
									return { eSignEnvelope, changeOrder: data.changeOrder };
								})
							);
						}
						else
						{
							return of({ eSignEnvelope, changeOrder: data.changeOrder });
						}
					}
				}
				else
				{
					eSignEnvelope = { envelopeGuid: data.envelopeId, edhChangeOrderGroupId: 0 };

					return of({ eSignEnvelope: eSignEnvelope, changeOrder: data.changeOrder });
				}
			}),
			switchMap(data =>
			{
				let actions = [];

				if (data.eSignEnvelope.eSignEnvelopeId && data.eSignEnvelope.eSignEnvelopeId !== 0)
				{
					actions.push(new ChangeOrderEnvelopeCreated(data.changeOrder, data.eSignEnvelope));
				}

				actions.push(new EnvelopeCreated(data.eSignEnvelope.envelopeGuid));
				actions.push(new ESignEnvelopesLoaded([data.eSignEnvelope])); // Load E-Sign envelope to populate job.changeOrderGroups with the envelope ID

				return from(actions);
			})
		), EnvelopeError, this.getErrorMessage)
	);

	@Effect()
	createTerminationEnvelope$: Observable<Action> = this.actions$.pipe(
		ofType<CreateTerminationEnvelope>(ContractActionTypes.CreateTerminationEnvelope),
		withLatestFrom(this.store, this.store.select(fromRoot.priceBreakdown), this.store.select(fromRoot.isSpecSalePending), this.store.select(fromLot.selectLot), this.store.select(fromScenario.elevationDP)),
		tryCatch(source => source.pipe(
			switchMap(([action, store, priceBreakdown, isSpecSalePending, selectLot, elevationDP]) =>
			{
				// get selected templates and sort by display order
				const templates = store.contract.selectedTemplates.map(id =>
				{
					return store.contract.templates.find(t => t.templateId === id);
				}).sort((a, b) => a.displayOrder < b.displayOrder ? -1 : a.displayOrder > b.displayOrder ? 1 : 0);

				let salesAgreementNotes = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === "Public") && n.noteSubCategoryId !== 10).map(n => n.noteContent).join(", ") : '';
				let termsAndConditions = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === "Public") && n.noteSubCategoryId === 10).map(n => n.noteContent).join() : '';

				const currentHouseSelections = templates.some(t => t.templateId === 0) ? getCurrentHouseSelections(store.scenario.tree.treeVersion.groups) : [];

				let jioSelections = {
					currentHouseSelections: currentHouseSelections,
					salesAgreementNotes: salesAgreementNotes
				};

				if (templates.length)
				{
					const marketId = store.org.salesCommunity.market.id;
					const financialCommunityId = store.job.financialCommunityId;
					const primBuyer = isSpecSalePending && store.changeOrder.changeInput.buyers ? store.changeOrder.changeInput.buyers.find(b => b.isPrimaryBuyer) : store.salesAgreement.buyers.find(b => b.isPrimaryBuyer);
					const primaryBuyer = primBuyer ? primBuyer.opportunityContactAssoc.contact : new Contact();
					const coBuyers = isSpecSalePending && store.changeOrder.changeInput.buyers ? store.changeOrder.changeInput.buyers.filter(b => !b.isPrimaryBuyer).sort((a, b) => a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? -1 : 1) : store.salesAgreement.buyers ? store.salesAgreement.buyers.filter(b => !b.isPrimaryBuyer).sort((a, b) => a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? -1 : 1) : [] as Buyer[];
					const nsoSummary = store.job.changeOrderGroups ? store.job.changeOrderGroups.filter(x => x.jobChangeOrders.find(y => y.jobChangeOrderTypeDescription == "NonStandard") && (x.salesStatusDescription === "Pending")) : [];

					const customerAddress = primaryBuyer.addressAssocs.find(a => a.isPrimary);
					const customerHomePhone = primaryBuyer.phoneAssocs.find(p => p.isPrimary);
					const customerWorkPhone = primaryBuyer.phoneAssocs.find(p => p.phone.phoneType === PhoneType.Business);
					const customerEmail = primaryBuyer.emailAssocs.find(e => e.isPrimary);

					const baseHousePrice = priceBreakdown.baseHouse || 0;
					const lotPremium = priceBreakdown.homesite || 0;
					const selectionsPrice = priceBreakdown.selections || 0;
					const totalHousePrice = priceBreakdown.totalPrice || 0;
					const nonStandardPrice = priceBreakdown.nonStandardSelections || 0;
					const changeOrderGroupId = store.job.changeOrderGroups.length ? store.job.changeOrderGroups[store.job.changeOrderGroups.length - 1].id : 0;
					const buyerClosingCosts = (priceBreakdown.closingIncentive || 0) + (priceBreakdown.closingCostAdjustment || 0);

					const jio = store.job.changeOrderGroups.find(a => a.jobChangeOrderGroupDescription === "Pulte Home Designer Generated Job Initiation Change Order");

					let jobBuyerHeaderInfo = {
						homePhone: customerHomePhone ? isNull(formatPhoneNumber(customerHomePhone.phone.phoneNumber), "") : "",
						workPhone: customerWorkPhone ? isNull(formatPhoneNumber(customerWorkPhone.phone.phoneNumber), "") : "",
						email: customerEmail ? isNull(customerEmail.email.emailAddress, "") : "",
						address: customerAddress && customerAddress.address ? isNull(customerAddress.address.address1, "").trim() + " " + isNull(customerAddress.address.address2, "").trim() + "," : "",
						cityStateZip: customerAddress && customerAddress.address ? `${isNull(customerAddress.address.city, "").trim()}, ${isNull(customerAddress.address.stateProvince, "").trim()} ${isNull(customerAddress.address.postalCode, "").trim()}` : ""
					}

					let jobAgreementHeaderInfo = {
						agreementNumber: store.salesAgreement.salesAgreementNumber,
						agreementCreatedDate: new Date(store.salesAgreement.createdUtcDate).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }),
						agreementApprovedDate: !!store.salesAgreement.approvedDate ? (new Date(store.salesAgreement.approvedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null,
						agreementSignedDate: !!store.salesAgreement.signedDate ? (new Date(store.salesAgreement.signedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null,
						communityName: selectLot.selectedLot.financialCommunity.name,
						communityMarketingName: store.org.salesCommunity.name,
						phaseName: !!store.job.lot.salesPhase && !!store.job.lot.salesPhase.salesPhaseName ? store.job.lot.salesPhase.salesPhaseName : "",
						garage: isNull(store.job.handing, ""),
						planName: store.job.plan.planSalesName,
						planID: store.job.plan.masterPlanNumber,
						elevation: elevationDP && elevationDP.choices.find(c => c.quantity > 0) ? elevationDP.choices.find(c => c.quantity > 0).label : "",
						lotBlock: isNull(store.job.lot.alternateLotBlock, ""),
						lotAddress: isNull(store.job.lot.streetAddress1, "").trim() + " " + isNull(store.job.lot.streetAddress2, "").trim(),
						cityStateZip: store.job.lot.city ? `${isNull(store.job.lot.city, "").trim()}, ${isNull(store.job.lot.stateProvince, "").trim()} ${isNull(store.job.lot.postalCode, "").trim()}` : "",
						lotBlockFullNumber: store.job.lot.lotBlock,
						salesAssociate: store.salesAgreement.consultants && store.salesAgreement.consultants.length ? store.salesAgreement.consultants[0].contact.firstName + " " + store.salesAgreement.consultants[0].contact.lastName : "",
						salesDescription: jio ? jio.jobChangeOrderGroupDescription : ""
					}

					var envelopeInfo = {
						oldHanding: store.job.handing,
						newHanding: store.changeOrder && store.changeOrder.changeInput && store.changeOrder.changeInput.handing ? store.changeOrder.changeInput.handing : null,
						buildType: store.job.lot ? store.job.lot.lotBuildTypeDesc : "",
						primaryBuyerName: isNull(store.changeOrder && store.changeOrder.changeInput ? store.changeOrder.changeInput.trustName : null, `${primaryBuyer.firstName ? primaryBuyer.firstName : ''}${primaryBuyer.middleName ? ' ' + primaryBuyer.middleName : ''} ${primaryBuyer.lastName ? ' ' + primaryBuyer.lastName : ''}${primaryBuyer.suffix ? ' ' + primaryBuyer.suffix : ''}`),
						primaryBuyerTrustName: isNull(store.changeOrder && store.changeOrder.changeInput && store.changeOrder.changeInput.trustName && store.changeOrder.changeInput.trustName.length > 20 ? `${store.changeOrder.changeInput.trustName.substring(0, 20)}...` : store.changeOrder && store.changeOrder.changeInput ? store.changeOrder.changeInput.trustName : null, `${primaryBuyer.firstName ? primaryBuyer.firstName : ''}${primaryBuyer.middleName ? ' ' + primaryBuyer.middleName : ''} ${primaryBuyer.lastName ? ' ' + primaryBuyer.lastName : ''}${primaryBuyer.suffix ? ' ' + primaryBuyer.suffix : ''}`),
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
						nsoSummary: this.contractService.getNsoOptionDetailsData(nsoSummary, store.job.jobNonStandardOptions),
						closingCostInformation: this.contractService.getProgramDetails(store.salesAgreement.programs, store.job.changeOrderGroups, 'BuyersClosingCost')
							.concat(store.salesAgreement.priceAdjustments ? store.salesAgreement.priceAdjustments.filter(a => a.priceAdjustmentType === 'ClosingCost')
								.map(a =>
								{
									return { salesProgramDescription: '', amount: a.amount, name: 'Price Adjustment', salesProgramId: 0 };
								}) : []),
						salesIncentiveInformation: this.contractService.getProgramDetails(store.salesAgreement.programs, store.job.changeOrderGroups, 'DiscountFlatAmount')
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
						buyerClosingCosts: buyerClosingCosts,
						jobBuyerHeaderInfo: jobBuyerHeaderInfo,
						jobAgreementHeaderInfo: jobAgreementHeaderInfo
					};

					const mappedTemplates = templates.map(t =>
					{
						return { templateId: t.templateId, displayOrder: templates.indexOf(t) + 1, documentName: t.documentName, templateTypeId: t.templateTypeId };
					});

					return this.contractService.getCustomMergeFields(marketId, financialCommunityId).pipe(
						withLatestFrom(
							this.store.pipe(select(fromRoot.systemMergeFields)),
							of(jioSelections),
							of(mappedTemplates),
							of(financialCommunityId),
							of(store.salesAgreement),
							of(envelopeInfo),
							of(store.job.id),
							of(changeOrderGroupId)
						)
					);
				}
				else
				{
					throw 'No Documents Selected';
				}
			}),
			exhaustMap(([customMergeFields, systemMergeFields, jioSelections, templates, financialCommunityId, salesAgreement, envelopeInfo, jobId, changeOrderGroupId]) =>
			{
				const convertedCustomMergeFields = convertMapToMergeFieldDto(customMergeFields);
				const convertedSystemMergeFields = convertMapToMergeFieldDto(systemMergeFields);

				return this.contractService.createEnvelope([...convertedCustomMergeFields, ...convertedSystemMergeFields], jioSelections, templates, financialCommunityId, salesAgreement.salesAgreementNumber, salesAgreement.status, envelopeInfo, jobId, changeOrderGroupId);
			}),
			switchMap(envelopeId =>
			{
				return from([
					new TerminationEnvelopeCreated(envelopeId)
				]);
			})
		), TerminationEnvelopeError, this.getErrorMessage)
	);

	private getErrorMessage(error: any): string
	{
		if (error.status === 400 && error.error.templateName)
		{
			return 'Following templates have not been uploaded : ' + error.error.templateName.join(', ');
		}
		else
		{
			return 'Error creating envelope!';
		}
	}

	@Effect()
	loadFinancialCommunityESign$: Observable<Action> = this.actions$.pipe(
		ofType<LoadFinancialCommunityESign>(ContractActionTypes.LoadFinancialCommunityESign),
		tryCatch(source => source.pipe(
			switchMap(action => this.contractService.getFinancialCommunityESign(action.financialCommunityId)),
			switchMap(agent => of(new FinancialCommunityESignLoaded(agent)))
		), LoadError, "Error loading Financial Community ESign!!")
	);

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private contractService: ContractService,
		private changeOrderService: ChangeOrderService) { }
}
