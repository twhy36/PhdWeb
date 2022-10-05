import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, of, from } from 'rxjs';
import { switchMap, withLatestFrom, exhaustMap, map, take } from 'rxjs/operators';

import
	{
		Buyer, Contact, PhoneType, ESignEnvelope, ESignStatusEnum, ESignTypeEnum, ChangeOrderGroup,
		formatPhoneNumber
	} from 'phd-common';

import * as fromRoot from '../reducers';
import * as fromLite from '../lite/reducer';
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
import { getCurrentHouseSelections } from '../../shared/classes/contract-utils';
import { ChangeOrderEnvelopeCreated, ESignEnvelopesLoaded } from '../actions';
import { isNull } from '../../shared/classes/string-utils.class';
import * as fromLot from '../lot/reducer';
import * as fromScenario from '../scenario/reducer';
import * as fromChangeOrder from '../change-order/reducer';
import * as _ from 'lodash';
import { EnvelopeInfo, SnapShotData } from '../../shared/models/envelope-info.model';

@Injectable()
export class ContractEffects
{
	templatesLoaded: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<TemplatesLoaded>(ContractActionTypes.TemplatesLoaded),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					if (store.salesAgreement.status === 'Pending')
					{
						return of(new AddRemoveSelectedTemplate(0, false, ESignTypeEnum.SalesAgreement));
					}
					else if (store.changeOrder.isChangingOrder)
					{
						return of(new SetChangeOrderTemplates(true));
					}

					return new Observable<never>();
				}),
			), LoadError, 'Error loading templates!!')
		);
	});

	createEnvelope$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<CreateEnvelope>(ContractActionTypes.CreateEnvelope),
			withLatestFrom(this.store,
				this.store.select(fromRoot.priceBreakdown),
				this.store.select(fromRoot.isSpecSalePending),
				this.store.select(fromLot.selectLot),
				this.store.select(fromScenario.elevationDP),
				this.store.select(fromChangeOrder.changeOrderPrimaryBuyer),
				this.store.select(fromChangeOrder.changeOrderCoBuyers),
				this.store.select(fromLite.selectedElevation),
				this.store.select(fromLite.selectedColorScheme),
				this.store.select(fromRoot.selectedPlanPrice)
			),
			tryCatch(source => source.pipe(
				switchMap(([action, store, priceBreakdown, isSpecSalePending, selectLot, elevationDP, coPrimaryBuyer, coCoBuyers, selectedLiteElevation, selectedLiteColorScheme, planPrice]) =>
				{
					const isPreview = action.isPreview;

					const currentSnapshot = this.contractService.createContractSnapshot(store, priceBreakdown, isSpecSalePending, selectLot, elevationDP, coPrimaryBuyer, coCoBuyers, selectedLiteElevation, selectedLiteColorScheme, planPrice);

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

					const lockedSnapshot = this.contractService.getSnapShot(store.job.id, activeChangeOrderGroup.id);

					const changeOrderData = new ChangeOrderGroup(store.changeOrder.currentChangeOrder);

					return lockedSnapshot.pipe(
						map(lockedSnapshot =>
						{
							return { lockedSnapshot, jioSelections: currentSnapshot.jioSelections, templates: currentSnapshot.templates, financialCommunityId: currentSnapshot.financialCommunityId, salesAgreement: store.salesAgreement, changeOrder: changeOrderData, envelopeInfo: currentSnapshot.envelopeInfo, isPreview: isPreview, jobId: store.job.id, changeOrderGroupId: activeChangeOrderGroup.id, envelopeId: activeChangeOrderGroup.envelopeId, currentSnapshot: currentSnapshot, isPhdLite: store.lite.isPhdLite };
						}),
						take(1)
					);
				}),
				exhaustMap(data =>
				{
					const snapShotData: SnapShotData = {
						jioSelections: data.jioSelections,
						templates: data.templates,
						financialCommunityId: data.financialCommunityId,
						salesAgreementNumber: data.salesAgreement.salesAgreementNumber,
						salesAgreementStatus: data.salesAgreement.status,
						envelopeInfo: data.envelopeInfo,
						jobId: data.jobId,
						changeOrderGroupId: data.changeOrderGroupId,
						constructionChangeOrderSelections: data.currentSnapshot.constructionChangeOrderSelections,
						changeOrderInformation: data.currentSnapshot.changeOrderInformation,
						salesChangeOrderSelections: null,
						planChangeOrderSelections: null,
						nonStandardChangeOrderSelections: null,
						lotTransferChangeOrderSelections: null
					};

					if (data.lockedSnapshot)
					{
						delete (data.lockedSnapshot['@odata.context']);
					}

					if (data.lockedSnapshot && JSON.stringify(data.lockedSnapshot) === JSON.stringify(data.currentSnapshot) && data.envelopeId)
					{
						return of({ envelopeId: data.envelopeId, changeOrder: data.changeOrder, isPreview: data.isPreview });
					}
					else
					{
						if (data.isPreview)
						{
							// Don't save snapshot for previews - ESign Addenda
							return this.contractService.createEnvelope(snapShotData, data.isPreview, data.isPhdLite).pipe(
								map(envelopeId =>
								{
									return { envelopeId, changeOrder: data.changeOrder, isPreview: data.isPreview };
								})
							);
						}
						return this.contractService.saveSnapshot(data.currentSnapshot, data.jobId, data.changeOrderGroupId).pipe(
							switchMap(() =>
								this.contractService.createEnvelope(snapShotData, data.isPreview, data.isPhdLite)),
							map(envelopeId =>
							{
								return { envelopeId, changeOrder: data.changeOrder, isPreview: data.isPreview };
							}
							));
					}
				}),
				switchMap(data =>
				{
					let eSignEnvelope: ESignEnvelope;

					if (!data.isPreview)
					{
						if (data.changeOrder.eSignEnvelopes && data.changeOrder.eSignEnvelopes.some(e => e.eSignStatusId === ESignStatusEnum.Created))
						{
							eSignEnvelope = new ESignEnvelope(data.changeOrder.eSignEnvelopes.find(e => e.eSignStatusId === ESignStatusEnum.Created));
							eSignEnvelope.envelopeGuid = data.envelopeId;

							return this.changeOrderService.updateESignEnvelope(eSignEnvelope).pipe(
								map((eSignEnvelope) =>
								{
									return { eSignEnvelope, changeOrder: data.changeOrder, isPreview: data.isPreview };
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
										return { eSignEnvelope, changeOrder: data.changeOrder, isPreview: data.isPreview };
									})
								);
							}
							else
							{
								return of({ eSignEnvelope, changeOrder: data.changeOrder, isPreview: data.isPreview });
							}
						}
					}
					else
					{
						eSignEnvelope = { envelopeGuid: data.envelopeId, edhChangeOrderGroupId: 0 };

						return of({ eSignEnvelope: eSignEnvelope, changeOrder: data.changeOrder, isPreview: data.isPreview });
					}
				}),
				switchMap(data =>
				{
					let actions = [];

					if (!data.isPreview && data.eSignEnvelope.eSignEnvelopeId && data.eSignEnvelope.eSignEnvelopeId !== 0)
					{
						actions.push(new ChangeOrderEnvelopeCreated(data.changeOrder, data.eSignEnvelope));
					}

					actions.push(new EnvelopeCreated(data.eSignEnvelope.envelopeGuid));

					if (!data.isPreview)
					{
						actions.push(new ESignEnvelopesLoaded([data.eSignEnvelope])); // Load E-Sign envelope to populate job.changeOrderGroups with the envelope ID
					}

					return from(actions);
				})
			), EnvelopeError, this.getErrorMessage)
		)
	);

	createTerminationEnvelope$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<CreateTerminationEnvelope>(ContractActionTypes.CreateTerminationEnvelope),
			withLatestFrom(this.store, this.store.select(fromRoot.priceBreakdown), this.store.select(fromRoot.isSpecSalePending), this.store.select(fromLot.selectLot), this.store.select(fromScenario.elevationDP)),
			tryCatch(source => source.pipe(
				map(([action, store, priceBreakdown, isSpecSalePending, selectLot, elevationDP]) =>
				{
					// get selected templates and sort by display order
					const templates = store.contract.selectedTemplates.map(id =>
					{
						return store.contract.templates.find(t => t.templateId === id);
					}).sort((a, b) => a.displayOrder < b.displayOrder ? -1 : a.displayOrder > b.displayOrder ? 1 : 0);

					let salesAgreementNotes = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === 'Public') && n.noteSubCategoryId !== 10).map(n => n.noteContent).join(', ') : '';
					let termsAndConditions = !!store.salesAgreement.notes && store.salesAgreement.notes.length ? store.salesAgreement.notes.filter(n => n.targetAudiences.find(x => x.name === 'Public') && n.noteSubCategoryId === 10).map(n => n.noteContent).join() : '';

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
						const nsoSummary = store.job.changeOrderGroups ? store.job.changeOrderGroups.filter(x => x.jobChangeOrders.find(y => y.jobChangeOrderTypeDescription == 'NonStandard') && (x.salesStatusDescription === 'Pending')) : [];

						const customerAddress = primaryBuyer.addressAssocs.find(a => a.isPrimary);
						const customerHomePhone = primaryBuyer.phoneAssocs.find(p => p.isPrimary);
						const customerWorkPhone = primaryBuyer.phoneAssocs.find(p => p.phone.phoneType === PhoneType.Business);
						const customerEmail = primaryBuyer.emailAssocs.find(e => e.isPrimary);

						const baseHousePrice = priceBreakdown.baseHouse || 0;
						const lotPremium = priceBreakdown.homesite || 0;
						const selectionsPrice = priceBreakdown.selections || 0;
						const totalHousePrice = priceBreakdown.totalPrice || 0;
						const nonStandardPrice = priceBreakdown.nonStandardSelections || 0;
						const changeOrderGroupId = store.job.changeOrderGroups.length ? store.job.changeOrderGroups[ store.job.changeOrderGroups.length - 1 ].id : 0;
						const buyerClosingCosts = (priceBreakdown.closingIncentive || 0) + (priceBreakdown.closingCostAdjustment || 0);

						const jio = store.job.changeOrderGroups.find(a =>
							a.jobChangeOrderGroupDescription === 'Pulte Home Designer Generated Job Initiation Change Order' ||
							a.jobChangeOrderGroupDescription === 'Homebuilder Generated Job Initiation Order'
						);

						let jobBuyerHeaderInfo = {
							homePhone: customerHomePhone ? isNull(formatPhoneNumber(customerHomePhone.phone.phoneNumber), '') : '',
							workPhone: customerWorkPhone ? isNull(formatPhoneNumber(customerWorkPhone.phone.phoneNumber), '') : '',
							email: customerEmail ? isNull(customerEmail.email.emailAddress, '') : '',
							address: customerAddress && customerAddress.address ? isNull(customerAddress.address.address1, '').trim() + ' ' + isNull(customerAddress.address.address2, '').trim() + ',' : '',
							cityStateZip: customerAddress && customerAddress.address ? `${isNull(customerAddress.address.city, '').trim()}, ${isNull(customerAddress.address.stateProvince, '').trim()} ${isNull(customerAddress.address.postalCode, '').trim()}` : ''
						}

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
							elevation: elevationDP && elevationDP.choices.find(c => c.quantity > 0) ? elevationDP.choices.find(c => c.quantity > 0).label : '',
							lotBlock: isNull(store.job.lot.alternateLotBlock, ''),
							lotAddress: isNull(store.job.lot.streetAddress1, '').trim() + ' ' + isNull(store.job.lot.streetAddress2, '').trim(),
							cityStateZip: store.job.lot.city ? `${isNull(store.job.lot.city, '').trim()}, ${isNull(store.job.lot.stateProvince, '').trim()} ${isNull(store.job.lot.postalCode, '').trim()}` : '',
							lotBlockFullNumber: store.job.lot.lotBlock,
							salesAssociate: store.salesAgreement.consultants && store.salesAgreement.consultants.length ? store.salesAgreement.consultants[0].contact.firstName + ' ' + store.salesAgreement.consultants[0].contact.lastName : '',
							salesDescription: jio ? jio.jobChangeOrderGroupDescription : ''
						};

						var envelopeInfo: EnvelopeInfo = {
							oldHanding: store.job.handing,
							newHanding: store.changeOrder?.changeInput?.handing?.handing,
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
							salesIncentivePrice: 0,
							buyerClosingCosts: buyerClosingCosts,
							jobBuyerHeaderInfo: jobBuyerHeaderInfo,
							jobAgreementHeaderInfo: jobAgreementHeaderInfo
						};

						const mappedTemplates = templates.map(t =>
						{
							return { templateId: t.templateId, displayOrder: templates.indexOf(t) + 1, documentName: t.documentName, templateTypeId: t.templateTypeId };
						});

						return { jioSelections, mappedTemplates, financialCommunityId, salesAgreement: store.salesAgreement, envelopeInfo, jobId: store.job.id, changeOrderGroupId, isPhdLite: store.lite.isPhdLite };
					}
					else
					{
						throw 'No Documents Selected';
					}
				}),
				exhaustMap(data =>
				{
					const snapShotData: SnapShotData = {
						jioSelections: data.jioSelections,
						templates: data.mappedTemplates,
						financialCommunityId: data.financialCommunityId,
						salesAgreementNumber: data.salesAgreement.salesAgreementNumber,
						salesAgreementStatus: data.salesAgreement.status,
						envelopeInfo: data.envelopeInfo,
						jobId: data.jobId,
						changeOrderGroupId: data.changeOrderGroupId,
						constructionChangeOrderSelections: null,
						changeOrderInformation: null,
						salesChangeOrderSelections: null,
						planChangeOrderSelections: null,
						nonStandardChangeOrderSelections: null,
						lotTransferChangeOrderSelections: null
					};
					return this.contractService.createEnvelope(snapShotData, null, data.isPhdLite);
				}),
				switchMap(envelopeId =>
				{
					return from([
						new TerminationEnvelopeCreated(envelopeId)
					]);
				})
			), TerminationEnvelopeError, this.getErrorMessage)
		)
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

	loadFinancialCommunityESign$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<LoadFinancialCommunityESign>(ContractActionTypes.LoadFinancialCommunityESign),
			tryCatch(source => source.pipe(
				switchMap(action => this.contractService.getFinancialCommunityESign(action.financialCommunityId)),
				switchMap(agent => of(new FinancialCommunityESignLoaded(agent)))
			), LoadError, 'Error loading Financial Community ESign!!')
		);
	});

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private contractService: ContractService,
		private changeOrderService: ChangeOrderService) { }
}
