import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError, of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, take, combineLatest } from 'rxjs/operators';

import
{
	defaultOnNotFound, withSpinner, Buyer, Contact, PhoneType, ESignTypeEnum, ChangeOrderChoice, ChangeOrderNonStandardOption,
	ChangeOrderGroup, LotExt, Plan, SalesAgreementProgram, SDPoint, DecisionPoint, formatPhoneNumber, PriceBreakdown,
	ScenarioOptionColor, TreeService
} from 'phd-common';

import { environment } from '../../../../environments/environment';

import { Template } from '../../shared/models/template.model';
import { IFinancialCommunityESign, FinancialCommunityESign, IESignRecipient } from '../../shared/models/contract.model';
import { SnapShotData } from '../../shared/models/envelope-info.model';
import
{
	getCurrentHouseSelections, getChangeOrderGroupSelections, getLiteCurrentHouseSelections, getLiteChangeOrderGroupSelections,
	getLiteConstructionChangeOrderPdfData
} from '../../shared/classes/contract-utils';
import * as _ from 'lodash';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../../modules/ngrx-store/reducers';
import { isNull } from '../../shared/classes/string-utils.class';
import * as fromLot from '../../ngrx-store/lot/reducer';
import * as fromChangeOrder from '../../ngrx-store/change-order/reducer';
import { _throw } from 'rxjs/observable/throw';

// PHD Lite
import { LegacyColorScheme, LitePlanOption } from '../../shared/models/lite.model';
import { LiteService } from './lite.service';
import * as fromLite from '../../ngrx-store/lite/reducer';

@Injectable()
export class ContractService
{
	private _ds: string = encodeURIComponent('$');

	constructor(private _http: HttpClient,
		private store: Store<fromRoot.State>,
		private treeService: TreeService,
		private liteService: LiteService) { }

	getTemplates(marketId: number, financialCommunityId: number): Observable<Array<Template>>
	{
		const entity = `contractTemplates`;
		const filter = `org/edhMarketId eq ${marketId} and templateFinancialCommunityAssocs/any(c: c/org/edhFinancialCommunityId eq ${financialCommunityId}) and status eq 'In Use' and isPhd eq true`;
		const orderBy = `displayOrder`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}orderby=${orderBy}`;
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

				return throwError(error);
			})
		);
	}
	createEnvelope(snapShotData: SnapShotData, isPreview?: boolean, isPhdLite?: boolean): Observable<string>
	{
		const action = isPhdLite ? `CreateEnvelopeLite` : `CreateEnvelope`;
		const url = `${environment.apiUrl}${action}`;
		const data = {
			isPreview: isPreview ? isPreview : false,
			templates: snapShotData.templates,
			jioSelections: snapShotData.jioSelections,
			financialCommunityId: snapShotData.financialCommunityId,
			jobId: snapShotData.jobId,
			changeOrderGroupId: snapShotData.changeOrderGroupId,
			salesAgreementNumber: snapShotData.salesAgreementNumber,
			salesAgreementStatus: snapShotData.salesAgreementStatus,
			constructionChangeOrderSelections: snapShotData.constructionChangeOrderSelections,
			salesChangeOrderSelections: snapShotData.salesChangeOrderSelections,
			planChangeOrderSelections: snapShotData.planChangeOrderSelections,
			nonStandardChangeOrderSelections: snapShotData.nonStandardChangeOrderSelections,
			lotTransferChangeOrderSelections: snapShotData.lotTransferChangeOrderSelections ? { lotDtos: snapShotData.lotTransferChangeOrderSelections } : null,
			changeOrderInformation: snapShotData.changeOrderInformation,
			salesAgreementInfo: { ...snapShotData.envelopeInfo }
		};

		return withSpinner(this._http).post<any>(url, data).pipe(
			map(response => response.value),
			catchError(error =>
			{
				return this.deleteSnapshot(snapShotData.jobId, snapShotData.changeOrderGroupId).pipe(
					switchMap(() => throwError(error))
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

		return withSpinner(this._http).get(url, { headers: headers, responseType: 'blob' }).pipe(
			map(response =>
			{
				return window.URL.createObjectURL(response);
			}),
			catchError(error =>
			{
				console.error(error);

				return throwError(error);
			})
		);
	}

	getFinancialCommunityESign(financialCommunityId: number): Observable<FinancialCommunityESign>
	{
		const entity = `eSignFields(${financialCommunityId})`;
		const url = `${environment.apiUrl}${entity}`;

		return this._http.get<IFinancialCommunityESign>(url).pipe(
			map(dto => new FinancialCommunityESign(dto)),
			defaultOnNotFound('getFinancialCommunityESign')
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
			defaultOnNotFound('SendEnvelope')
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

				return throwError(error);
			})
		);
	}

	deleteEnvelope(envelopeId: string): Observable<string>
	{
		const action = `DeleteEnvelope`;
		const url = `${environment.apiUrl}${action}`;
		const data = { envelopeId: envelopeId };

		return withSpinner(this._http).post<any>(url, data).pipe(
			catchError(error =>
			{
				console.error(error);

				return throwError(error);
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

				return throwError(error);
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

				return throwError(error);
			})
		);
	}

	getPreviewDocument(currentSnapshot: SnapShotData, isPreview?: boolean, isAddenda?: boolean, isPhdLite?: boolean)
	{
		const action = isPhdLite ? `GetPreviewDocumentLite` : `GetPreviewDocument`;
		const url = `${environment.apiUrl}${action}`;
		const headers = new HttpHeaders({
			'Content-Type': 'application/json',
			'Accept': 'application/pdf'
		});

		const data = {
			isPreview: isPreview ? isPreview : false,
			isAddenda: isAddenda ? isAddenda : false,
			templates: currentSnapshot.templates,
			jioSelections: currentSnapshot.jioSelections,
			financialCommunityId: currentSnapshot.financialCommunityId,
			jobId: currentSnapshot.jobId,
			changeOrderGroupId: currentSnapshot.changeOrderGroupId,
			salesAgreementNumber: currentSnapshot.salesAgreementNumber,
			salesAgreementStatus: currentSnapshot.salesAgreementStatus,
			constructionChangeOrderSelections: currentSnapshot.constructionChangeOrderSelections,
			salesChangeOrderSelections: currentSnapshot.salesChangeOrderSelections,
			planChangeOrderSelections: currentSnapshot.planChangeOrderSelections,
			nonStandardChangeOrderSelections: currentSnapshot.nonStandardChangeOrderSelections,
			lotTransferChangeOrderSelections: currentSnapshot.lotTransferChangeOrderSelections ? { lotDtos: currentSnapshot.lotTransferChangeOrderSelections } : null,
			changeOrderInformation: currentSnapshot.changeOrderInformation,
			salesAgreementInfo: { ...currentSnapshot.envelopeInfo }
		};

		return withSpinner(this._http).post(url, data, { headers: headers, responseType: 'blob' }).pipe(
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

	createContractSnapshot(
		store: fromRoot.State,
		priceBreakdown: PriceBreakdown,
		isSpecSalePending: boolean,
		selectLot: fromLot.State,
		elevationDP: DecisionPoint,
		coPrimaryBuyer: Buyer,
		coCoBuyers: Buyer[],
		selectedLiteElevation: LitePlanOption,
		selectedLiteColorScheme: ScenarioOptionColor,
		legacyColorScheme: LegacyColorScheme,
		planPrice: number)
	{
		// get selected templates and sort by display order
		const templates = store.contract.selectedTemplates.length ? store.contract.selectedTemplates.map(id =>
		{
			return store.contract.templates.find(t => t.templateId === id);
		}).sort((a, b) => a.displayOrder < b.displayOrder ? -1 : a.displayOrder > b.displayOrder ? 1 : 0) : [{ displayName: 'JIO', displayOrder: 2, documentName: 'JIO', templateId: 0, templateTypeId: 4, marketId: 0, version: 0 }];

		let salesAgreementNotes = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === 'Public') && n.noteSubCategoryId !== 10).map(n => n.noteContent).join(', ') : '';
		let termsAndConditions = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === 'Public') && n.noteSubCategoryId === 10).map(n => n.noteContent).join('*') : '';

		const liteBaseHouseOptions = this.liteService.getSelectedBaseHouseOptions(
			store.lite.scenarioOptions,
			store.lite.options,
			store.lite.categories
		);

		let currentHouseSelections = [];

		if (templates.some(t => t.templateId === 0))
		{
			currentHouseSelections = store.lite.isPhdLite
				? getLiteCurrentHouseSelections(store.lite, selectedLiteElevation, selectedLiteColorScheme, legacyColorScheme, liteBaseHouseOptions, planPrice)
				: getCurrentHouseSelections(store.scenario.tree.treeVersion.groups);
		}

		let jioSelections =
		{
			currentHouseSelections: currentHouseSelections,
			salesAgreementNotes: salesAgreementNotes
		};

		if (templates.length)
		{
			const salesAgreementStatus = store.salesAgreement.status;
			const financialCommunityId = store.job.financialCommunityId;
			const salesAgreement = store.salesAgreement;
			const primBuyer = isSpecSalePending && store.changeOrder.changeInput.buyers ? store.changeOrder.changeInput.buyers.find(b => b.isPrimaryBuyer) : store.salesAgreement.buyers.find(b => b.isPrimaryBuyer);
			const primaryBuyer = primBuyer ? primBuyer.opportunityContactAssoc.contact : new Contact();
			const coBuyers = isSpecSalePending && store.changeOrder.changeInput.buyers ? store.changeOrder.changeInput.buyers.filter(b => !b.isPrimaryBuyer).sort((a, b) => a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? -1 : 1) : store.salesAgreement.buyers ? store.salesAgreement.buyers.filter(b => !b.isPrimaryBuyer).sort((a, b) => a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? -1 : 1) : [] as Buyer[];
			const nsoSummary = store.job.changeOrderGroups ? store.job.changeOrderGroups.filter(x => x.jobChangeOrders.find(y => y.jobChangeOrderTypeDescription == 'NonStandard') && (x.salesStatusDescription === 'Pending')) : [];

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

			let jobBuyerHeaderInfo =
			{
				homePhone: customerHomePhone ? isNull(formatPhoneNumber(customerHomePhone.phone.phoneNumber), '') : '',
				workPhone: customerWorkPhone ? isNull(formatPhoneNumber(customerWorkPhone.phone.phoneNumber), '') : '',
				email: customerEmail ? isNull(customerEmail.email.emailAddress, '') : '',
				address: customerAddress && customerAddress.address ? isNull(customerAddress.address.address1, '').trim() + ' ' + isNull(customerAddress.address.address2, '').trim() : '',
				cityStateZip: customerAddress && customerAddress.address ? `${isNull(customerAddress.address.city, '').trim()}, ${isNull(customerAddress.address.stateProvince, '').trim()} ${isNull(customerAddress.address.postalCode, '').trim()}` : ''
			};

			const elevationName = store.lite.isPhdLite
				? selectedLiteElevation.name
				: elevationDP && elevationDP.choices.find(c => c.quantity > 0) ? elevationDP.choices.find(c => c.quantity > 0).label : '';

			let jobAgreementHeaderInfo =
			{
				agreementNumber: store.salesAgreement.salesAgreementNumber,
				agreementCreatedDate: new Date(createdDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
				agreementApprovedDate: !!store.salesAgreement.approvedDate ? (new Date(store.salesAgreement.approvedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : null,
				agreementSignedDate: !!store.salesAgreement.signedDate ? (new Date(store.salesAgreement.signedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : null,
				communityName: selectLot.selectedLot.financialCommunity.name,
				communityMarketingName: store.org.salesCommunity.name,
				phaseName: !!store.job.lot.salesPhase && !!store.job.lot.salesPhase.salesPhaseName ? store.job.lot.salesPhase.salesPhaseName : '',
				garage: isNull(store.job.handing, ''),
				planName: store.job.plan.planSalesName,
				planID: store.job.plan.masterPlanNumber,
				elevation: elevationName,
				lotBlock: isNull(store.job.lot.alternateLotBlock, ''),
				lotAddress: isNull(store.job.lot.streetAddress1, '').trim() + ' ' + isNull(store.job.lot.streetAddress2, '').trim(),
				cityStateZip: store.job.lot.city ? `${isNull(store.job.lot.city, '').trim()}, ${isNull(store.job.lot.stateProvince, '').trim()} ${isNull(store.job.lot.postalCode, '').trim()}` : '',
				lotBlockFullNumber: store.job.lot.lotBlock,
				salesAssociate: store.salesAgreement.consultants && store.salesAgreement.consultants.length ? store.salesAgreement.consultants[0].contact.firstName + ' ' + store.salesAgreement.consultants[0].contact.lastName :
					jio && jio.contact ? jio.contact.displayName : '',
				salesDescription: jio ? jio.jobChangeOrderGroupDescription : ''
			};

			var envelopeInfo =
			{
				oldHanding: store.job.handing,
				newHanding: store.changeOrder && store.changeOrder.changeInput && store.changeOrder.changeInput.handing ? store.changeOrder.changeInput.handing.handing : null,
				buildType: store.job.lot ? store.job.lot.lotBuildTypeDesc : '',
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
			let lotAddress = (lot.streetAddress1 ? lot.streetAddress1 : '') + ' ' + (lot.streetAddress2 ? lot.streetAddress2 : '') + ',' + (lot.city ? lot.city : '') + ',' + (lot.stateProvince ? lot.stateProvince : '') + ' ' + (lot.postalCode ? lot.postalCode : '');

			const inChangeOrderOrSpecSale = store.changeOrder.isChangingOrder || isSpecSalePending;
			let buyer = inChangeOrderOrSpecSale ? coPrimaryBuyer : store.salesAgreement.buyers.find(t => t.isPrimaryBuyer === true);
			const buyerContact = buyer && buyer.opportunityContactAssoc ? buyer.opportunityContactAssoc.contact : null;
			const currentBuyerName = buyerContact ? `${buyerContact.firstName ? buyerContact.firstName : ''}${buyerContact.middleName ? ' ' + buyerContact.middleName : ''} ${buyerContact.lastName ? ' ' + buyerContact.lastName : ''}${buyerContact.suffix ? ' ' + buyerContact.suffix : ''}` : '';

			const sagBuyers = store.salesAgreement.buyers.filter(t => t.isPrimaryBuyer === false);
			let coBuyerList = sagBuyers;

			if (inChangeOrderOrSpecSale)
			{
				const deletedBuyers = sagBuyers.filter(x => x.id !== buyer.id && coCoBuyers.findIndex(b => b.opportunityContactAssoc.id === x.opportunityContactAssoc.id) < 0);

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

			let salesConsultant = store.salesAgreement.consultants.length > 0 ? (store.salesAgreement.consultants[0].contact.firstName + ' ' + store.salesAgreement.consultants[0].contact.lastName) : '';
			let homePhone = '';
			let workPhone = '';
			let buyerCurrentAddress = '';

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
				});
			}

			let buyerAddressAssoc = buyer && buyer.opportunityContactAssoc.contact.addressAssocs.length > 0 ? buyer.opportunityContactAssoc.contact.addressAssocs.find(t => t.isPrimary === true) : null;

			if (buyerAddressAssoc)
			{
				buyerCurrentAddress = (buyerAddressAssoc.address.address1 ? buyerAddressAssoc.address.address1 : '') + ' ' + (buyerAddressAssoc.address.address2 ? buyerAddressAssoc.address.address2 : '') + ',' + (buyerAddressAssoc.address.city ? buyerAddressAssoc.address.city : '') + ',' + (buyerAddressAssoc.address.stateProvince ? buyerAddressAssoc.address.stateProvince : '') + ' ' + (buyerAddressAssoc.address.postalCode ? buyerAddressAssoc.address.postalCode : '');
			}

			let financialCommunity = store.org.salesCommunity.financialCommunities[0];

			let decisionPoints = store.lite.isPhdLite
				? [] // TODO For PHD Lite 
				: _.flatMap(store.scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

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

			let customerSelections = store.lite.isPhdLite
				? [] // TODO For PHD Lite 
				: getChangeOrderGroupSelections(store.scenario.tree.treeVersion.groups, <ChangeOrderChoice[]>currentChangeOrderChoices);

			constructionChangeOrderSelectionsDto = {
				constructionChangeOrderSelections: customerSelections,
				changeOrderChoices: currentChangeOrderChoices
			};

			let jobChangeOrderChoices = this.getConstructionChangeOrderPdfData(<ChangeOrderChoice[]>currentChangeOrderChoices);

			constructionChangeOrderSelections = constructionChangeOrderSelectionsDto.constructionChangeOrderSelections;

			let changeOrderInformation = {
				agreementId: store.salesAgreement.id,
				createdUtcDate: store.salesAgreement.createdUtcDate,
				approvedDate: store.salesAgreement.approvedDate,
				communityName: financialCommunity.name.trim() + ' - ' + financialCommunity.number,
				lotAddress: lotAddress,
				lotBlock: lot.lotBlock,
				phase: lot.salesPhase ? lot.salesPhase.salesPhaseName : '',
				garage: lot.handings.map(h => h.name),
				planName: planName,
				planId: planId,
				elevation: elevationChoice ? elevationChoice.label : '',
				buyerName: currentBuyerName,
				coBuyerName: '',
				currentCoBuyers: currentCoBuyers,
				homePhone: homePhone,
				workPhone: workPhone,
				email: buyer && buyer.opportunityContactAssoc.contact.emailAssocs.length > 0 ? buyer.opportunityContactAssoc.contact.emailAssocs.find(t => t.isPrimary === true).email.emailAddress : '',
				currentAddress: buyerCurrentAddress,
				salesConsultant: salesConsultant,
				salesAgreementNotes: salesAgreementNotes,
				changeOrderCreatedDate: new Date(activeChangeOrderGroup.createdUtcDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
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
			};

			return currentSnapshot;
		}
	}

	createSnapShot(changeOrder: any): Observable<any>
	{
		return this.treeService.getChoiceCatalogIds(changeOrder.jobChangeOrderChoices || [], true).pipe(
			switchMap(changeOrderChoices => this.store.pipe(
				withLatestFrom(this.store.select(fromRoot.priceBreakdown),
					this.store.select(fromRoot.isSpecSalePending),
					this.store.select(fromLot.selectLot),
					this.store.select(fromChangeOrder.changeOrderPrimaryBuyer),
					this.store.select(fromChangeOrder.changeOrderCoBuyers),
					this.store.select(fromLite.selectedElevation),
					this.store.select(fromLite.selectedColorScheme),
					this.store.select(fromRoot.legacyColorScheme)
				),
				map(([store, priceBreakdown, isSpecSalePending, selectLot, coPrimaryBuyer, coCoBuyers, selectedLiteElevation, selectedLiteColorScheme, legacyColorScheme]) =>
				{
					// Only display the CO#/JIO - Exclude any selected addenda's
					const templates = [{ displayName: 'JIO', displayOrder: 2, documentName: 'JIO', templateId: 0, templateTypeId: 4, marketId: 0, version: 0 }];

					const liteBaseHouseOptions = this.liteService.getSelectedBaseHouseOptions(
						store.lite.scenarioOptions,
						store.lite.options,
						store.lite.categories
					);

					let currentHouseSelections = [];
					if (templates.some(t => t.templateId === 0))
					{
						currentHouseSelections = store.lite.isPhdLite
							? getLiteCurrentHouseSelections(
								store.lite, selectedLiteElevation,
								selectedLiteColorScheme,
								legacyColorScheme,
								liteBaseHouseOptions,
								priceBreakdown.baseHouse
							)
							: getCurrentHouseSelections(store.scenario.tree.treeVersion.groups);
					}

					let salesAgreementNotes = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === 'Public') && n.noteSubCategoryId !== 10).map(n => n.noteContent).join(', ') : '';
					let addedTermsAndConditions = store.changeOrder.currentChangeOrder.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'SalesNotes') ? store.changeOrder.currentChangeOrder.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'SalesNotes').salesNotesChangeOrders.filter(sncos => sncos.action === 'Add').map(snco => snco.note) : [];
					let removedTermsAndConditions = store.changeOrder.currentChangeOrder.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'SalesNotes') ? store.changeOrder.currentChangeOrder.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'SalesNotes').salesNotesChangeOrders.filter(sncos => sncos.action === 'Delete').map(snco => snco.note) : [];
					let previousTermsAndConditions = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === 'Public') && n.noteSubCategoryId === 10 && !removedTermsAndConditions.some(rtnc => rtnc.id === n.id)) : [];

					previousTermsAndConditions.push(...addedTermsAndConditions);

					let termsAndConditions = previousTermsAndConditions.map(tcs => tcs.noteContent).join('*');
					let jioSelections = {
						currentHouseSelections: currentHouseSelections,
						salesAgreementNotes: salesAgreementNotes
					};

					let decisionPoints = store.lite.isPhdLite
						? []
						: _.flatMap(store.scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

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
						changeOrder.salesChangeOrderTrusts.length > 0 ||
						changeOrder.salesNotesChangeOrders.length > 0)
					{
						salesChangeOrderSelections = {
							salesChangeOrderTypeDescription: changeOrder.jobChangeOrderGroupDescription,
							salesChangeOrderPriceAdjustments: changeOrder.salesChangeOrderPriceAdjustments,
							salesChangeOrderSalesPrograms: changeOrder.salesChangeOrderSalesPrograms,
							salesChangeOrderBuyers: salesChangeOrderBuyers,
							salesChangeOrderTrusts: changeOrder.salesChangeOrderTrusts,
							salesNotesChangeOrders: changeOrder.salesNotesChangeOrders.length > 0
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
							let constructionChangeOrderSelections = store.lite.isPhdLite
								? getLiteChangeOrderGroupSelections(
									store.lite.scenarioOptions,
									changeOrder.jobChangeOrderPlanOptions,
									liteBaseHouseOptions,
									store.lite.options,
									store.lite.categories,
									legacyColorScheme
								)
								: getChangeOrderGroupSelections(store.scenario.tree.treeVersion.groups, <ChangeOrderChoice[]>changeOrderChoices);

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
					let lotAddress = (lot.streetAddress1 ? lot.streetAddress1 : '') + ' ' + (lot.streetAddress2 ? lot.streetAddress2 : '') + ',' + (lot.city ? lot.city : '') + ',' + (lot.stateProvince ? lot.stateProvince : '') + ' ' + (lot.postalCode ? lot.postalCode : '');

					const inChangeOrderOrSpecSale = store.changeOrder.isChangingOrder || isSpecSalePending;
					let buyer = inChangeOrderOrSpecSale ? coPrimaryBuyer : store.salesAgreement.buyers.find(t => t.isPrimaryBuyer === true);
					const buyerContact = buyer && buyer.opportunityContactAssoc ? buyer.opportunityContactAssoc.contact : null;
					const currentBuyerName = buyerContact ? (`${buyerContact.firstName ? buyerContact.firstName : ''}${buyerContact.middleName ? ' ' + buyerContact.middleName : ''} ${buyerContact.lastName ? ' ' + buyerContact.lastName : ''}${buyerContact.suffix ? ' ' + buyerContact.suffix : ''}`) : '';

					const sagBuyers = store.salesAgreement.buyers.filter(t => t.isPrimaryBuyer === false);
					let coBuyerList = sagBuyers;

					if (inChangeOrderOrSpecSale)
					{
						const deletedBuyers = sagBuyers.filter(x => x.id !== buyer.id && coCoBuyers.findIndex(b => b.opportunityContactAssoc.id === x.opportunityContactAssoc.id) < 0);

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

					let salesConsultant = store.salesAgreement.consultants.length > 0 ? (store.salesAgreement.consultants[0].contact.firstName + ' ' + store.salesAgreement.consultants[0].contact.lastName) : '';
					let homePhone = '';
					let workPhone = '';
					let buyerCurrentAddress = '';

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
						});
					}

					let buyerAddressAssoc = buyer && buyer.opportunityContactAssoc.contact.addressAssocs.length > 0 ? buyer.opportunityContactAssoc.contact.addressAssocs.find(t => t.isPrimary === true) : null;

					if (buyerAddressAssoc)
					{
						buyerCurrentAddress = (buyerAddressAssoc.address.address1 ? buyerAddressAssoc.address.address1 : '') + ' ' + (buyerAddressAssoc.address.address2 ? buyerAddressAssoc.address.address2 : '') + ',' + (buyerAddressAssoc.address.city ? buyerAddressAssoc.address.city : '') + ',' + (buyerAddressAssoc.address.stateProvince ? buyerAddressAssoc.address.stateProvince : '') + ' ' + (buyerAddressAssoc.address.postalCode ? buyerAddressAssoc.address.postalCode : '');
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
						communityName: financialCommunity.name.trim() + ' - ' + financialCommunity.number,
						lotAddress: lotAddress,
						lotBlock: lot.lotBlock,
						phase: lot.salesPhase ? lot.salesPhase.salesPhaseName : '',
						garage: lot.handings.map(h => h.name),
						planName: planName,
						planId: planId,
						elevation: elevationChoice ? elevationChoice.label : '',
						buyerName: currentBuyerName,
						coBuyerName: '',
						currentCoBuyers: currentCoBuyers,
						homePhone: homePhone,
						workPhone: workPhone,
						email: buyer && buyer.opportunityContactAssoc.contact.emailAssocs.length > 0 ? buyer.opportunityContactAssoc.contact.emailAssocs.find(t => t.isPrimary === true).email.emailAddress : '',
						currentAddress: buyerCurrentAddress,
						salesConsultant: salesConsultant,
						salesAgreementNotes: salesAgreementNotes,
						changeOrderCreatedDate: new Date(changeOrder.createdUtcDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
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
						const nsoSummary = store.job.changeOrderGroups ? store.job.changeOrderGroups.filter(x => x.jobChangeOrders.find(y => y.jobChangeOrderTypeDescription == 'NonStandard') && (x.salesStatusDescription === 'Pending')) : [];
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
							homePhone: customerHomePhone ? isNull(formatPhoneNumber(customerHomePhone.phone.phoneNumber), '') : '',
							workPhone: customerWorkPhone ? isNull(formatPhoneNumber(customerWorkPhone.phone.phoneNumber), '') : '',
							email: customerEmail ? isNull(customerEmail.email.emailAddress, '') : '',
							address: customerAddress && customerAddress.address ? isNull(customerAddress.address.address1, '').trim() + ' ' + isNull(customerAddress.address.address2, '').trim() : '',
							cityStateZip: customerAddress && customerAddress.address ? `${isNull(customerAddress.address.city, '').trim()}, ${isNull(customerAddress.address.stateProvince, '').trim()} ${isNull(customerAddress.address.postalCode, '').trim()}` : ''
						};

						const elevationName = store.lite.isPhdLite
							? selectedLiteElevation?.name
							: (store.job.jobPlanOptions?.find(x => x.jobOptionTypeName === 'Elevation')?.optionSalesName || '');

						let jobAgreementHeaderInfo = {
							agreementNumber: store.salesAgreement.salesAgreementNumber,
							agreementCreatedDate: new Date(store.salesAgreement.createdUtcDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
							agreementApprovedDate: !!store.salesAgreement.approvedDate ? (new Date(store.salesAgreement.approvedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : null,
							agreementSignedDate: !!store.salesAgreement.signedDate ? (new Date(store.salesAgreement.signedDate.toString().replace(/-/g, '\/').replace(/T.+/, ''))).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : null,
							communityName: selectLot.selectedLot.financialCommunity.name,
							communityMarketingName: store.org.salesCommunity.name,
							phaseName: !!store.job.lot.salesPhase && !!store.job.lot.salesPhase.salesPhaseName ? store.job.lot.salesPhase.salesPhaseName : '',
							garage: isNull(store.job.handing, ''),
							planName: store.job.plan.planSalesName,
							planID: store.job.plan.masterPlanNumber,
							elevation: elevationName,
							lotBlock: isNull(store.job.lot.alternateLotBlock, ''),
							lotAddress: isNull(store.job.lot.streetAddress1, '').trim() + ' ' + isNull(store.job.lot.streetAddress2, '').trim(),
							cityStateZip: store.job.lot.city ? `${isNull(store.job.lot.city, '').trim()}, ${isNull(store.job.lot.stateProvince, '').trim()} ${isNull(store.job.lot.postalCode, '').trim()}` : '',
							lotBlockFullNumber: store.job.lot.lotBlock,
							salesAssociate: store.salesAgreement.consultants && store.salesAgreement.consultants.length ? store.salesAgreement.consultants[0].contact.firstName + ' ' + store.salesAgreement.consultants[0].contact.lastName :
								changeOrder.createdBy ? changeOrder.createdBy : '',
							salesDescription: changeOrder ? changeOrder.jobChangeOrderGroupDescription : ''
						};

						var envelopeInfo = {
							oldHanding: store.job.handing,
							newHanding: store.changeOrder && store.changeOrder.changeInput && store.changeOrder.changeInput.handing ? store.changeOrder.changeInput.handing.handing : null,
							buildType: store.job.lot ? store.job.lot.lotBuildTypeDesc : '',
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
							let jobChangeOrderChoices = store.lite.isPhdLite
								? getLiteConstructionChangeOrderPdfData(
									store.lite.options,
									store.lite.categories,
									changeOrder.jobChangeOrderPlanOptions,
									selectedLiteElevation,
									legacyColorScheme
								)
								: this.getConstructionChangeOrderPdfData(constructionChangeOrderSelectionsDto.changeOrderChoices);

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
						};

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

		// #393416 Combine programs between COs
		coPrograms = coPrograms
			.reduce((arr, prog) =>
			{
				const existing = arr.find(obj => obj.salesAgreementProgram.salesProgramId === prog.salesAgreementProgram.salesProgramId || obj.salesAgreementProgram.salesProgram.name === prog.salesAgreementProgram.salesProgram.name);

				if (existing)
				{
					existing.salesAgreementProgram.amount += prog.salesAgreementProgram.amount;

					if (prog.salesAgreementProgram.salesProgramDescription)
					{
						existing.salesAgreementProgram.salesProgramDescription = (existing.salesAgreementProgram.salesProgramDescription ? existing.salesAgreementProgram.salesProgramDescription + '; ' : '') + prog.salesAgreementProgram.salesProgramDescription;
					}
				}
				else
				{
					arr.push(prog);
				}

				return arr;
			}, []);

		mappedPrograms.forEach(p =>
		{
			p.amount -= _.sum(coPrograms.filter(cop => cop.approved && (cop.salesAgreementProgram.salesProgramId === p.salesProgramId)).map(cop => cop.salesAgreementProgram.amount));

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
			// #382452 Combine sales programs by ID/Name and get the total sum of their values
			.reduce((arr, prog) =>
			{
				const existing = arr.find(obj => obj.salesProgramId === prog.salesProgramId || obj.salesProgram.name === prog.salesProgram.name);

				if (existing)
				{
					existing.amount += prog.amount;

					if (prog.salesProgramDescription)
					{
						existing.salesProgramDescription = (existing.salesProgramDescription ? existing.salesProgramDescription + '; ' : '') + prog.salesProgramDescription;
					}
				}
				else
				{
					arr.push(prog);
				}

				return arr;
			}, [])
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

				return throwError(error);
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

		return withSpinner(this._http).get(url, { headers: headers, responseType: 'blob' }).pipe(
			map(response =>
			{
				return window.URL.createObjectURL(response);
			}),
			catchError(error =>
			{
				console.error(error);

				return throwError(error);
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

	getEnvelope(jobId: number, changeOrderId: number, approvedDate: Date, signedDate: Date, isPhdLite: boolean)
	{
		return this.getSnapShot(jobId, changeOrderId).pipe(
			switchMap(lockedSnapshot =>
			{
				if (lockedSnapshot)
				{
					delete (lockedSnapshot['@odata.context']);

					var clonedSnapshot = _.cloneDeep(lockedSnapshot);

					clonedSnapshot.envelopeInfo.jobAgreementHeaderInfo.agreementApprovedDate = approvedDate ? new Date(approvedDate.toString().replace(/-/g, '\/').replace(/T.+/, '')).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : null;
					clonedSnapshot.envelopeInfo.jobAgreementHeaderInfo.agreementSignedDate = signedDate ? new Date(signedDate.toString().replace(/-/g, '\/').replace(/T.+/, '')).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : null;

					if (JSON.stringify(lockedSnapshot) !== JSON.stringify(clonedSnapshot))
					{
						// Only show the JIO
						clonedSnapshot.templates = [{ templateId: 0, displayOrder: 2, documentName: 'JIO', templateTypeId: 4 }];

						return this.saveSnapshot(clonedSnapshot, jobId, changeOrderId).pipe(
							switchMap(() =>
							{
								const snapShotData: SnapShotData = {
									jioSelections: clonedSnapshot.jioSelections,
									templates: clonedSnapshot.templates,
									financialCommunityId: clonedSnapshot.financialCommunityId,
									salesAgreementNumber: clonedSnapshot.salesAgreementNumber,
									salesAgreementStatus: clonedSnapshot.salesAgreementStatus,
									envelopeInfo: clonedSnapshot.envelopeInfo,
									jobId: clonedSnapshot.jobId,
									changeOrderGroupId: clonedSnapshot.changeOrderGroupId,
									constructionChangeOrderSelections: clonedSnapshot.constructionChangeOrderSelections,
									changeOrderInformation: clonedSnapshot.changeOrderInformation,
									salesChangeOrderSelections: clonedSnapshot.salesChangeOrderSelections,
									planChangeOrderSelections: clonedSnapshot.planChangOrderSelections,
									nonStandardChangeOrderSelections: clonedSnapshot.nonStandardChangeOrderSelections,
									lotTransferChangeOrderSelections: clonedSnapshot.lotTransferSelections
								};
								return this.createEnvelope(snapShotData, null, isPhdLite).pipe(
									map(() =>
									{
										return of(true);
									})
								);
							})
						);
					}
					return of(true);
				}
				return of(false);
			})
		);
	}

	getNsoOptionDetailsData(nsoSummary: any, jobNonStandardOptions: any)
	{
		let nsoDetails = nsoSummary ? nsoSummary.map(result =>
		{
			let nsoChangeOrder = result.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'NonStandard').jobChangeOrderNonStandardOptions[0];
			return {
				nonStandardOptionName: nsoChangeOrder.nonStandardOptionName,
				nonStandardOptionDescription: nsoChangeOrder.nonStandardOptionDescription,
				nonStandardOptionQuantity: nsoChangeOrder.qty,
				nonStandardOptionUnitPrice: nsoChangeOrder.unitPrice,
				nonStandardOptionAction: nsoChangeOrder.action
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
