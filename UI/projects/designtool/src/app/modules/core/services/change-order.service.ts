import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError, tap, flatMap } from 'rxjs/operators';

import * as _ from 'lodash';

import
	{
		getNewGuid, createBatchPatch, createBatchBody, createBatchHeaders, withSpinner, DesignToolAttribute, Buyer, ESignEnvelope,
		ChangeOrderGroup, ChangeOrderNonStandardOption, ChangeInput, ChangeOrderChoice, ChangeOrderPlanOption, ChangeOrderChoiceLocation,
		ChangeOrderHanding, ChangeTypeEnum, Job, JobChoice, JobChoiceAttribute, JobChoiceLocation, JobPlanOption, PlanOption, Plan, SalesAgreement,
		SalesChangeOrderTrust, Tree, DecisionPoint, Choice, IdentityService
	} from 'phd-common';

import { environment } from '../../../../environments/environment';
import { TreeService } from '../../core/services/tree.service';
import { isJobChoice, isLocked, getDefaultOptionRule } from '../../shared/classes/tree.utils';

interface ChoiceExt { decisionPointLabel: string, subgroupLabel: string, groupLabel: string };

@Injectable()
export class ChangeOrderService
{
	private _ds: string = encodeURIComponent("$");
	private _batch = "$batch";

	constructor(private _http: HttpClient,
		private _identityService: IdentityService,
		private _treeService: TreeService
	) { }

	private isJobPlanOption(option: PlanOption | JobPlanOption): option is JobPlanOption
	{
		return typeof (<any>option).optionSalesName !== 'undefined';
	}

	getTreeVersionIdByJobPlan(planId: number): Observable<number> 
	{
		let url = environment.apiUrl + `GetTreeVersionIdByJobPlan(planId=${planId})`;

		return this._http.get(url).pipe(
			map(response =>
			{
				return response['value'] as number;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	updateJobChangeOrder(dtos: Array<ChangeOrderGroup>): Observable<Array<ChangeOrderGroup>>
	{
		return this._identityService.token.pipe(
			flatMap((token: string) =>
			{
				const changeOrdersToBeUpdated: Array<any> = [];
				const approvedChangeOrdersToBeUpdated: Array<any> = [];
				let batchRequests;
				let approvedBatchRequests;

				dtos.forEach(t =>
				{
					if (t.salesStatusDescription === 'Approved')
					{
						approvedChangeOrdersToBeUpdated.push({
							id: t.id,
							salesStatusDescription: t.salesStatusDescription,
							constructionStatusDescription: t.constructionStatusDescription
						} as any);
					}
					else
					{
						changeOrdersToBeUpdated.push({
							id: t.id,
							salesStatusDescription: t.salesStatusDescription,
							salesStatusReason: t.salesStatusReason ? t.salesStatusReason : ''
						} as any);
					}
				});

				approvedBatchRequests = createBatchPatch<any>(approvedChangeOrdersToBeUpdated, 'id', 'changeOrderGroups', 'salesStatusDescription', 'constructionStatusDescription');
				batchRequests = createBatchPatch<any>(changeOrdersToBeUpdated, 'id', 'changeOrderGroups', 'salesStatusDescription', 'salesStatusReason');

				const batchGuid = getNewGuid();
				const batchBody = createBatchBody(batchGuid, [approvedBatchRequests, batchRequests]);
				const headers = new HttpHeaders(createBatchHeaders(batchGuid, token));

				const endPoint = `${environment.apiUrl}${this._batch}`;

				return this._http.post(endPoint, batchBody, { headers, responseType: 'text' });
			}),
			map(results =>
			{
				let response = JSON.parse(results);

				return response['responses'].map(t => t.body);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getSalesChangeOrderData(currentChangeOrder: ChangeOrderGroup, salesAgreement: SalesAgreement, changeInput: ChangeInput, jobId: number, isSpecSales: boolean): any
	{
		const buyerChangeOrder = currentChangeOrder && currentChangeOrder.jobChangeOrders
			? currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'BuyerChangeOrder')
			: null;

		const priceAdjustmentChangeOrder = currentChangeOrder && currentChangeOrder.jobChangeOrders
			? currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'PriceAdjustment')
			: null;

		const salesNotesChangeOrder = currentChangeOrder && currentChangeOrder.jobChangeOrders
			? currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'SalesNotes')
			: null;

		let data: any = {
			changeOrderGroupId: currentChangeOrder.id,
			changeOrderType: 'Sales',
			jobId: jobId,
			salesAgreementId: salesAgreement.id,
			description: currentChangeOrder.jobChangeOrderGroupDescription,
			note: currentChangeOrder.note ? currentChangeOrder.note.noteContent : null,
			changeOrderGroupSequence: currentChangeOrder.changeOrderGroupSequence,
			changeOrderGroupSequenceSuffix: currentChangeOrder.changeOrderGroupSequenceSuffix,
			saveBuyerContact: isSpecSales
		};

		if (priceAdjustmentChangeOrder &&
			priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments &&
			priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments.length)
		{
			data.salesChangeOrderPriceAdjustments = priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments;
		}

		if (priceAdjustmentChangeOrder &&
			priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms &&
			priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms.length)
		{
			data.salesChangeOrderSalesPrograms = priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms;
		}

		if (salesNotesChangeOrder && salesNotesChangeOrder.salesNotesChangeOrders && salesNotesChangeOrder.salesNotesChangeOrders.length)
		{
			data.salesNotesChangeOrders = salesNotesChangeOrder.salesNotesChangeOrders.map(snco =>
			{
				return {
					id: snco.id,
					changeOrderId: snco.changeOrderId,
					noteId: snco.noteId,
					action: snco.action
				}
			});
		}
		const buyers = this.getSalesChangeOrderBuyers(salesAgreement.buyers, changeInput.buyers);
		if (buyers && buyers.length)
		{
			data.salesChangeOrderBuyers = buyers;
		}

		const trusts = this.getSalesChangeOrderTrusts(changeInput, salesAgreement, currentChangeOrder);
		if (trusts && trusts.length)
		{
			data.salesChangeOrderTrusts = trusts;
		}

		return data;
	}

	getSalesChangeOrderBuyers(salesAgreementBuyers: Array<Buyer>, currentBuyers: Array<Buyer>): Array<any>
	{
		let buyers = [];

		if (currentBuyers)
		{
			currentBuyers.forEach(curBuyer =>
			{
				const existingBuyer = salesAgreementBuyers.find(x => x.opportunityContactAssoc.id === curBuyer.opportunityContactAssoc.id);

				if (existingBuyer)
				{
					if (this.buyerSwapped(existingBuyer, curBuyer))
					{
						buyers.push(this.mapChangeOrderBuyer(existingBuyer, 'Delete'));
						buyers.push(this.mapChangeOrderBuyer(curBuyer, 'Add'));
					} else if (this.buyerNameChanged(existingBuyer, curBuyer))
					{
						buyers.push(this.mapChangeOrderBuyer(curBuyer, 'Change'));
					}
				} else
				{
					buyers.push(this.mapChangeOrderBuyer(curBuyer, 'Add'));
				}

			});

			const deletedBuyers = salesAgreementBuyers.filter(x => currentBuyers.findIndex(y => y.opportunityContactAssoc.id === x.opportunityContactAssoc.id) < 0);

			deletedBuyers.forEach(buyer =>
			{
				buyers.push(this.mapChangeOrderBuyer(buyer, 'Delete'));
			});
		}

		return buyers;
	}

	buyerNameChanged(prevBuyer: Buyer, currentBuyer: Buyer): boolean
	{
		return prevBuyer.opportunityContactAssoc.contact.firstName !== currentBuyer.opportunityContactAssoc.contact.firstName
			|| prevBuyer.opportunityContactAssoc.contact.lastName !== currentBuyer.opportunityContactAssoc.contact.lastName
			|| prevBuyer.opportunityContactAssoc.contact.middleName !== currentBuyer.opportunityContactAssoc.contact.middleName
			|| prevBuyer.opportunityContactAssoc.contact.suffix !== currentBuyer.opportunityContactAssoc.contact.suffix;
	}

	buyerSwapped(prevBuyer: Buyer, currentBuyer: Buyer): boolean
	{
		return prevBuyer.isPrimaryBuyer !== currentBuyer.isPrimaryBuyer
			|| prevBuyer.sortKey !== currentBuyer.sortKey;
	}

	mapChangeOrderBuyer(buyer: Buyer, action: string)
	{
		let newBuyer = {
			id: buyer.id < 0 ? 0 : buyer.id,
			action: action,
			isPrimaryBuyer: buyer.isPrimaryBuyer,
			sortKey: buyer.sortKey,
			opportunityContactAssoc: {
				id: buyer.opportunityContactAssoc.id,
				contactId: buyer.opportunityContactAssoc.contactId,
				isPrimary: buyer.opportunityContactAssoc.isPrimary,
				contact: {
					id: buyer.opportunityContactAssoc.contact.id,
					firstName: buyer.opportunityContactAssoc.contact.firstName,
					lastName: buyer.opportunityContactAssoc.contact.lastName,
					middleName: buyer.opportunityContactAssoc.contact.middleName,
					prefix: buyer.opportunityContactAssoc.contact.prefix,
					suffix: buyer.opportunityContactAssoc.contact.suffix
				},
				opportunity: {
					dynamicsOpportunityId: buyer.opportunityContactAssoc.opportunity.dynamicsOpportunityId,
					salesCommunityId: buyer.opportunityContactAssoc.opportunity.salesCommunityId,
				}
			},
			addressAssocs: _.cloneDeep(buyer.opportunityContactAssoc.contact.addressAssocs),
			emailAssocs: _.cloneDeep(buyer.opportunityContactAssoc.contact.emailAssocs),
			phoneAssocs: _.cloneDeep(buyer.opportunityContactAssoc.contact.phoneAssocs)
		};

		if (buyer.id < 0)
		{
			newBuyer.addressAssocs.forEach(address =>
			{
				address.id = address.id < 0 ? 0 : address.id;

				if (address.address)
				{
					address.address.id = address.id;
				}
			});

			newBuyer.emailAssocs.forEach(email =>
			{
				email.id = email.id < 0 ? 0 : email.id;

				if (email.email)
				{
					email.email.id = email.id;
				}
			});

			newBuyer.phoneAssocs.forEach(phone =>
			{
				phone.id = phone.id < 0 ? 0 : phone.id;

				if (phone.phone)
				{
					phone.phone.id = phone.id;
				}
			});
		}

		return newBuyer;
	}

	getSalesChangeOrderTrusts(changeInput: ChangeInput, salesAgreement: SalesAgreement, currentChangeOrder: ChangeOrderGroup): Array<SalesChangeOrderTrust>
	{
		let trusts = [];

		if (changeInput.trustName !== salesAgreement.trustName)
		{
			const existingTrusts = this.getExistingChangeOrderTrusts(currentChangeOrder);
			if (salesAgreement.trustName)
			{
				trusts.push({
					id: existingTrusts.deletedTrust && existingTrusts.deletedTrust.trustName === salesAgreement.trustName ? existingTrusts.deletedTrust.id : 0,
					trustName: salesAgreement.trustName,
					action: 'Delete'
				});
			}

			if (changeInput.trustName)
			{
				trusts.push({
					id: existingTrusts.addedTrust ? existingTrusts.addedTrust.id : 0,
					trustName: changeInput.trustName,
					action: 'Add'
				});
			}
		}

		return trusts;
	}

	getExistingChangeOrderTrusts(currentChangeOrder: ChangeOrderGroup)
	{
		const buyerChangeOrder = currentChangeOrder && currentChangeOrder.jobChangeOrders
			? currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'BuyerChangeOrder')
			: null;

		const changeOrderTrusts = buyerChangeOrder ? buyerChangeOrder.jobSalesChangeOrderTrusts : null;

		return {
			addedTrust: changeOrderTrusts ? changeOrderTrusts.find(x => x.action === 'Add') : null,
			deletedTrust: changeOrderTrusts ? changeOrderTrusts.find(x => x.action === 'Delete') : null
		}
	}

	createESignEnvelope(eSignEnvelope: ESignEnvelope): Observable<ESignEnvelope>
	{
		let url = environment.apiUrl + `eSignEnvelopes`;

		return withSpinner(this._http).post(url, eSignEnvelope, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((response: ESignEnvelope) =>
			{
				return response;
			}),
			catchError(error =>
			{
				console.log(error);

				return _throw(error);
			})
		)
	}

	updateESignEnvelope(eSignEnvelopeDto: ESignEnvelope): Observable<ESignEnvelope>
	{
		const url = `${environment.apiUrl}eSignEnvelopes(${eSignEnvelopeDto.eSignEnvelopeId})`;

		return this._http.patch(url, eSignEnvelopeDto, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((response: ESignEnvelope) =>
			{
				return response as ESignEnvelope;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	deleteESignEnvelope(eSignEnvelopeId: number)
	{
		const url = `${environment.apiUrl}eSignEnvelopes(${eSignEnvelopeId})`;

		return withSpinner(this._http).delete(url).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(error =>
			{
				console.error(error);
				return _throw(error);
			})
		);
	}	

	getChangeOrderTypeAutoApproval(communityId: number): Observable<Array<{ isAutoApproval: boolean, edhChangeOrderTypeId: number }>>
	{
		const url = `${environment.apiUrl}changeOrderTypeAutoApprovals`;

		const body = {
			'financialCommunityId': communityId
		};

		return withSpinner(this._http).post(url, body).pipe(
			map((response: any) =>
			{
				const responseVal = response.value as Array<{ isAutoApproval: boolean, edhChangeOrderTypeId: number }>;
				return responseVal;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getTreePointsByJobId(jobId: number): Observable<Array<DecisionPoint>>
	{
		let url = environment.apiUrl + `GetTreePointsByJobId(jobId=${jobId})`;

		return this._http.get(url).pipe(
			map(response =>
			{
				return response['result'] as Array<DecisionPoint>;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	createJobChangeOrder(data: any, changePrice: number): Observable<ChangeOrderGroup>
	{
		let url = environment.apiUrl + `CreateOrUpdateChangeOrder`;

		return withSpinner(this._http).post(url, { changeOrderDto: data, changePrice: changePrice }).pipe(
			tap(response => response['@odata.context'] = undefined),
			map((response: ChangeOrderGroup) =>
			{
				const cog = new ChangeOrderGroup(response as ChangeOrderGroup);
				//copy choice catalog IDs that were originally on the choices to the new objects, since those aren't in EDH
				cog.jobChangeOrders.forEach(co =>
				{
					co.jobChangeOrderChoices.forEach(c =>
					{
						const origChoice = data.choices && data.choices.find(ch => ch.dpChoiceId === c.decisionPointChoiceID);

						if (origChoice)
						{
							c.divChoiceCatalogId = origChoice.divChoiceCatalogId;
						}
					});
				});
				return cog;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getJobChangeOrderInputData(tree: Tree, changeOrder: ChangeOrderGroup, job: Job, handing: ChangeOrderHanding, salesAgreementId: number, baseHouseOption: PlanOption | JobPlanOption, isJio: boolean = false, planPrice: number = 0): any
	{
		const origChoices = isJio ? [] : job.jobChoices;
		const currentChoices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))) || [];
		const elevationDP = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).find(dp => dp.dPointTypeId === 1);
		const colorSchemeDP = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).find(dp => dp.dPointTypeId === 2);
		const origHanding = isJio ? '' : job.handing;

		return {
			changeOrderGroupId: changeOrder.id,
			changeOrderType: 'Construction',
			jobId: job.id,
			salesAgreementId: salesAgreementId,
			description: changeOrder.jobChangeOrderGroupDescription,
			note: changeOrder.note ? changeOrder.note.noteContent : null,
			overrideNote: changeOrder.overrideNote,
			choices: this.createJobChangeOrderChoices(origChoices, currentChoices, elevationDP, colorSchemeDP, tree, job.jobPlanOptions),
			handings: this.createJobChangeOrderHandings(handing, origHanding),
			changeOrderGroupSequence: changeOrder.changeOrderGroupSequence,
			changeOrderGroupSequenceSuffix: changeOrder.changeOrderGroupSequenceSuffix,
			baseHouseOption: baseHouseOption ? {
				planOptionId: this.isJobPlanOption(baseHouseOption) ? baseHouseOption.planOptionId : baseHouseOption.id,
				price: this.isJobPlanOption(baseHouseOption) ? baseHouseOption.listPrice : planPrice,
				quantity: this.isJobPlanOption(baseHouseOption) ? baseHouseOption.optionQty : 1,
				optionSalesName: this.isJobPlanOption(baseHouseOption) ? baseHouseOption.optionSalesName : baseHouseOption.name,
				optionDescription: this.isJobPlanOption(baseHouseOption) ? baseHouseOption.optionDescription : baseHouseOption.description
			} : null
		};
	}

	private createJobChangeOrderChoices(origChoices: Array<JobChoice>, currentChoices: Array<Choice>, elevationDP: DecisionPoint, colorSchemeDP: DecisionPoint, tree: Tree, jobPlanOptions: Array<JobPlanOption>): Array<any>
	{
		const mappingsChanged = function (orig: JobChoice, curr: Choice)
		{
			const addedOptions = curr.options.filter(o1 => !orig.jobChoiceJobPlanOptionAssocs.some(o2 => o1.id === jobPlanOptions.find(po => po.id === o2.jobPlanOptionId).planOptionId));
			const removedOptions = orig.jobChoiceJobPlanOptionAssocs.map(jp => jobPlanOptions.find(o => o.id === jp.jobPlanOptionId))
				.filter(po => !curr.options.some(o => o.id === po.planOptionId) && po.jobOptionTypeName !== 'BaseHouse');
			return addedOptions.length || removedOptions.length;
		};

		let choicesDto = [];
		const currentSelectedChoices = currentChoices.filter(x => x.quantity > 0);

		currentSelectedChoices.forEach(cur =>
		{
			const origChoice = origChoices.find(orig => orig.dpChoiceId === cur.id || orig.divChoiceCatalogId === cur.divChoiceCatalogId);
			const labels = this.getChoiceLabels(cur, tree);

			if (origChoice && !mappingsChanged(origChoice, cur))
			{
				const changedChoices = this.mapChangedChoice({ ...cur, ...labels }, origChoice, elevationDP, colorSchemeDP, jobPlanOptions);

				choicesDto.push(...changedChoices);

			}
			else
			{
				// new choice
				choicesDto.push({
					dpChoiceId: cur.id,
					divChoiceCatalogId: cur.divChoiceCatalogId,
					dpChoiceQuantity: cur.quantity,
					dpChoiceCalculatedPrice: cur.price || 0,
					choiceLabel: cur.label,
					decisionPointLabel: labels.decisionPointLabel,
					subgroupLabel: labels.subgroupLabel,
					groupLabel: labels.groupLabel,
					overrideNote: cur.overrideNote,
					options: this.mapOptions(cur.options, cur.quantity, 'Add'),
					attributes: this.mapAttributes(cur, 'Add'),
					locations: this.mapLocations(cur, 'Add'),
					action: 'Add',
					isElevation: elevationDP ? cur.treePointId === elevationDP.id : false,
					isColorScheme: colorSchemeDP ? cur.treePointId === colorSchemeDP.id : false
				});
			}
		});

		origChoices.forEach(orig =>
		{
			const currentChoice = currentSelectedChoices.find(cur => cur.id === orig.dpChoiceId || cur.divChoiceCatalogId === orig.divChoiceCatalogId);
			const labels = this.getChoiceLabels(orig, tree);

			if (!currentChoice || (currentChoice && mappingsChanged(orig, currentChoice)))
			{
				// deleted choice
				choicesDto.push({
					dpChoiceId: orig.dpChoiceId,
					divChoiceCatalogId: orig.divChoiceCatalogId,
					dpChoiceQuantity: orig.dpChoiceQuantity,
					dpChoiceCalculatedPrice: orig.dpChoiceCalculatedPrice || 0,
					choiceLabel: orig.choiceLabel,
					decisionPointLabel: labels.decisionPointLabel,
					subgroupLabel: labels.subgroupLabel,
					groupLabel: labels.groupLabel,
					options: orig.jobChoiceJobPlanOptionAssocs ? this.mapOptions(orig.jobChoiceJobPlanOptionAssocs.filter(o => o.choiceEnabledOption).map(jp => jobPlanOptions.find(o => o.id === jp.jobPlanOptionId)), orig.dpChoiceQuantity, 'Delete') : [],
					attributes: this.mapJobChoiceAttributes(orig.jobChoiceAttributes, 'Delete'),
					locations: this.mapJobChoiceLocations(orig.jobChoiceLocations, 'Delete'),
					action: 'Delete',
					isElevation: elevationDP ? this.isElevationOrColorSchemeDP(currentChoices, orig, elevationDP.id) : false,
					isColorScheme: colorSchemeDP ? this.isElevationOrColorSchemeDP(currentChoices, orig, colorSchemeDP.id) : false
				});
			}
		});

		return choicesDto;
	}

	private mapChangedChoice(curChoice: Choice & ChoiceExt, origChoice: JobChoice, elevationDP: DecisionPoint, colorSchemeDP: DecisionPoint, jobPlanOptions: Array<JobPlanOption>): Array<any>
	{
		let choicesDto = [];

		let locations = [];
		const currentLocations = this.mapLocations(curChoice) || [];
		const existingLocations = this.mapJobChoiceLocations(origChoice.jobChoiceLocations, null) || [];

		currentLocations.forEach(loc =>
		{
			const existingLocation = existingLocations.find(e => e.locationCommunityId === loc.locationCommunityId);

			if (!existingLocation)
			{
				loc.action = 'Add';
				loc.attributes.forEach(a => a.action = 'Add');

				locations.push({ ...loc });
			}
			else
			{
				let attributes = this.buildAttributeDifference(loc.attributes, existingLocation.attributes);

				if (attributes.length || existingLocation.quantity !== loc.quantity)
				{
					loc.action = 'Change';
					loc.attributes = attributes || [];

					locations.push({ ...loc });
				}
			}
		});

		let deletedLocations = existingLocations.filter(a => currentLocations.findIndex(e => e.locationCommunityId === a.locationCommunityId) < 0) || [];

		deletedLocations.forEach(x =>
		{
			x.action = 'Delete';
			x.attributes.forEach(a => a.action = 'Delete');
		});

		locations.push(...deletedLocations);

		const currentAttributes = this.mapAttributes(curChoice);
		const existingAttributes = this.mapJobChoiceAttributes(origChoice.jobChoiceAttributes, null);
		const attributes = this.buildAttributeDifference(currentAttributes, existingAttributes);

		const addedOptions = curChoice.options.filter(o1 => !origChoice.jobChoiceJobPlanOptionAssocs.some(o2 => o1.id === jobPlanOptions.find(po => po.id === o2.jobPlanOptionId).planOptionId));
		const removedOptions = origChoice.jobChoiceJobPlanOptionAssocs.map(jp => jobPlanOptions.find(o => o.id === jp.jobPlanOptionId))
			.filter(po => !curChoice.options.some(o => o.id === po.planOptionId) && po.jobOptionTypeName !== 'BaseHouse'); //exclude Base House because we don't want to remove that
		const otherOptions = curChoice.options.filter(o1 => origChoice.jobChoiceJobPlanOptionAssocs.some(o2 => o1.id === jobPlanOptions.find(po => po.id === o2.jobPlanOptionId).planOptionId));

		if (attributes.length || locations.length || curChoice.price !== origChoice.dpChoiceCalculatedPrice || curChoice.quantity !== origChoice.dpChoiceQuantity)
		{
			choicesDto.push({
				dpChoiceId: origChoice.dpChoiceId,
				divChoiceCatalogId: curChoice.divChoiceCatalogId,
				dpChoiceQuantity: curChoice.quantity,
				dpChoiceCalculatedPrice: curChoice.price || 0,
				choiceLabel: curChoice.label,
				decisionPointLabel: curChoice.decisionPointLabel,
				subgroupLabel: curChoice.subgroupLabel,
				groupLabel: curChoice.groupLabel,
				overrideNote: curChoice.overrideNote,
				options: [
					...this.mapOptions(otherOptions, curChoice.quantity, 'Change'),
					...this.mapOptions(removedOptions, origChoice.dpChoiceQuantity, 'Delete'),
					...this.mapOptions(addedOptions, curChoice.quantity, 'Add')
				],
				attributes: attributes,
				locations: locations,
				action: 'Change',
				isElevation: elevationDP ? curChoice.treePointId === elevationDP.id : false,
				isColorScheme: colorSchemeDP ? curChoice.treePointId === colorSchemeDP.id : false
			});
		}
		else if (addedOptions.length || removedOptions.length)
		{
			choicesDto.push({
				dpChoiceId: origChoice.dpChoiceId,
				divChoiceCatalogId: curChoice.divChoiceCatalogId,
				dpChoiceQuantity: curChoice.quantity,
				dpChoiceCalculatedPrice: curChoice.price || 0,
				choiceLabel: curChoice.label,
				decisionPointLabel: curChoice.decisionPointLabel,
				subgroupLabel: curChoice.subgroupLabel,
				groupLabel: curChoice.groupLabel,
				overrideNote: curChoice.overrideNote,
				options: [
					...this.mapOptions(removedOptions, origChoice.dpChoiceQuantity, 'Delete'),
					...this.mapOptions(addedOptions, curChoice.quantity, 'Add')
				],
				attributes: [],
				locations: [],
				action: 'Change',
				isElevation: elevationDP ? curChoice.treePointId === elevationDP.id : false,
				isColorScheme: colorSchemeDP ? curChoice.treePointId === colorSchemeDP.id : false
			});
		}

		return choicesDto;
	}

	private buildAttributeDifference(currentAttributes: Array<any>, existingAttributes: Array<any>): Array<any>
	{
		let result = [];

		currentAttributes.forEach(attr =>
		{
			const existingAttr = existingAttributes.find(ex => ex.attributeCommunityId === attr.attributeCommunityId &&
				ex.attributeGroupCommunityId === attr.attributeGroupCommunityId);

			if (!existingAttr)
			{
				result.push({ ...attr, action: 'Add' });
			}
		});

		existingAttributes.forEach(ex =>
		{
			const currentAttr = currentAttributes.find(attr => ex.attributeCommunityId === attr.attributeCommunityId &&
				ex.attributeGroupCommunityId === attr.attributeGroupCommunityId);

			if (!currentAttr)
			{
				result.push({ ...ex, action: 'Delete' });
			}
		});

		return result;
	}

	private isElevationOrColorSchemeDP(currentChoices: Array<Choice>, origChoiceId: JobChoice, pointId: number): boolean
	{
		const choice = currentChoices.find(c => c.id === origChoiceId.dpChoiceId || c.divChoiceCatalogId === origChoiceId.divChoiceCatalogId);

		return choice ? choice.treePointId === pointId : false;
	}

	private createJobChangeOrderHandings(currentHanding: ChangeOrderHanding, jobHanding: string): Array<any>
	{
		const handings = [];

		if (currentHanding && currentHanding.handing !== jobHanding)
		{
			if (currentHanding)
			{
				handings.push({
					handing: currentHanding.handing,
					action: 'Add',
					overrideNote: currentHanding.overrideNote
				});
			}
			if (jobHanding)
			{
				handings.push({
					handing: jobHanding,
					action: 'Delete'
				});
			}
		}

		return handings;
	}

	private mapOptions(options: Array<JobPlanOption | PlanOption>, quantity: number, action: string): Array<any>
	{
		let optionsDto: Array<any> = [];

		if (options.length)
		{
			optionsDto = options.map(o =>
			{
				return {
					planOptionId: this.isJobPlanOption(o) ? o.planOptionId : o.id,
					price: o.listPrice ? o.listPrice : 0,
					quantity: this.isJobPlanOption(o) ? o.optionQty : quantity,
					optionSalesName: this.isJobPlanOption(o) ? o.optionSalesName : o.name,
					optionDescription: this.isJobPlanOption(o) ? o.optionDescription : o.description,
					jobOptionTypeName: this.isJobPlanOption(o) ? o.jobOptionTypeName : null,
					attributeGroupIds: this.isJobPlanOption(o) ? o.jobPlanOptionAttributes.map(att => att.attributeGroupCommunityId).filter((value, index, self) => self.indexOf(value) === index) : o.attributeGroups,
					locationGroupIds: this.isJobPlanOption(o) ? o.jobPlanOptionLocations.map(loc => loc.locationGroupCommunityId).filter((value, index, self) => self.indexOf(value) === index) : o.locationGroups,
					action: action
				};
			});
		}

		return optionsDto;
	}

	private mapLocations(choice: Choice, action?: string): Array<any>
	{
		const locationsDto: Array<any> = [];

		if (choice.selectedAttributes)
		{
			choice.selectedAttributes.forEach(a =>
			{
				if (a.locationGroupId)
				{
					const locationDto = locationsDto.find(dto => dto.locationCommunityId === a.locationId);

					if (locationDto)
					{
						if (a.attributeId)
						{
							let attribute = {
								attributeCommunityId: a.attributeId,
								attributeGroupCommunityId: a.attributeGroupId,
								attributeName: a.attributeName,
								attributeGroupLabel: a.attributeGroupLabel,
								sku: a.sku,
								manufacturer: a.manufacturer,
							};

							if (action)
							{
								(attribute as any).action = action;
							}

							locationDto.attributes.push(attribute);
						}
					}
					else
					{
						let location = {
							locationCommunityId: a.locationId,
							locationGroupCommunityId: a.locationGroupId,
							locationName: a.locationName,
							locationGroupLabel: a.locationGroupLabel,
							quantity: a.locationQuantity,
							attributes: a.attributeId
								? [
									{
										attributeCommunityId: a.attributeId,
										attributeGroupCommunityId: a.attributeGroupId,
										attributeName: a.attributeName,
										attributeGroupLabel: a.attributeGroupLabel,
										sku: a.sku,
										manufacturer: a.manufacturer,
									}
								]
								: []
						};

						if (action)
						{
							(location as any).action = action;

							if (location.attributes)
							{
								location.attributes.forEach(attr => (attr as any).action = action);
							}
						}

						locationsDto.push(location);
					}
				}
			});
		}

		return locationsDto;
	}

	private mapAttributes(choice: Choice, action?: string): Array<any>
	{
		const attributesDto: Array<any> = [];

		if (choice.selectedAttributes)
		{
			choice.selectedAttributes.forEach(a =>
			{
				if (!a.locationGroupId)
				{
					let attribute = {
						attributeCommunityId: a.attributeId,
						attributeGroupCommunityId: a.attributeGroupId,
						attributeName: a.attributeName,
						attributeGroupLabel: a.attributeGroupLabel,
						sku: a.sku,
						manufacturer: a.manufacturer
					};

					if (action)
					{
						(attribute as any).action = action;
					}

					attributesDto.push(attribute);
				}
			});
		}

		return attributesDto;
	}

	private mapJobChoiceAttributes(jobChoiceAttributes: Array<JobChoiceAttribute>, action: string): Array<any>
	{
		const attributesDto: Array<any> = [];

		if (jobChoiceAttributes)
		{
			jobChoiceAttributes.forEach(att =>
			{
				attributesDto.push({
					attributeCommunityId: att.attributeCommunityId,
					attributeGroupCommunityId: att.attributeGroupCommunityId,
					attributeName: att.attributeName,
					attributeGroupLabel: att.attributeGroupLabel,
					sku: att.sku,
					manufacturer: att.manufacturer,
					action: action
				});
			});
		}

		return attributesDto;
	}

	private mapJobChoiceLocations(jobChoiceLocations: Array<JobChoiceLocation>, action: string): Array<any>
	{
		const locationsDto: Array<any> = [];

		if (jobChoiceLocations)
		{
			jobChoiceLocations.forEach(loc =>
			{
				const locationDto = locationsDto.find(dto => dto.locationCommunityId === loc.locationCommunityId);

				if (locationDto)
				{
					let attributes = this.mapJobChoiceAttributes(loc.jobChoiceLocationAttributes, action);

					attributes && attributes.forEach(a =>
					{
						locationDto.attributes.push(a);
					});
				}
				else
				{
					locationsDto.push({
						locationCommunityId: loc.locationCommunityId,
						locationGroupCommunityId: loc.locationGroupCommunityId,
						locationName: loc.locationName,
						locationGroupLabel: loc.locationGroupLabel,
						quantity: loc.quantity,
						attributes: this.mapJobChoiceAttributes(loc.jobChoiceLocationAttributes, action),
						action: action
					});
				}
			});
		}

		return locationsDto;
	}

	// This function retrieves the selected choices and the selected choice attributes from job
	// so that it can revert to its original state if we cancel the change order process
	getOriginalChoicesAndAttributes(job: Job, currTree: Tree, changeOrder?: ChangeOrderGroup): any
	{
		let selectedChoices = [];

		const origChoices = (changeOrder && changeOrder.id) ? this.getSelectedChoices(job, changeOrder) : job.jobChoices;
		let currentChoices = _.cloneDeep(_.flatMap(currTree.treeVersion.groups,
			g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))));

		currentChoices.forEach(currentChoice =>
		{
			const origChoice = origChoices.find(c => c.divChoiceCatalogId === currentChoice.divChoiceCatalogId);

			if (origChoice)
			{
				// get the locations and attributes if available
				const origSelectedAttributes = origChoice.jobChoiceLocations ? _.flatten(origChoice.jobChoiceLocations.map(l =>
				{
					return l.jobChoiceLocationAttributes && l.jobChoiceLocationAttributes.length ? l.jobChoiceLocationAttributes.map(a =>
					{
						return <DesignToolAttribute>{
							attributeId: a.attributeCommunityId,
							attributeGroupId: a.attributeGroupCommunityId,
							scenarioChoiceLocationId: a.id,
							scenarioChoiceLocationAttributeId: l.id,
							locationGroupId: l.locationGroupCommunityId,
							locationId: l.locationCommunityId,
							locationQuantity: l.quantity,
							attributeGroupLabel: a.attributeGroupLabel,
							attributeName: a.attributeName,
							locationGroupLabel: l.locationGroupLabel,
							locationName: l.locationName,
							sku: a.sku,
							manufacturer: a.manufacturer
						};
					}) : [<DesignToolAttribute>{
						locationGroupId: l.locationGroupCommunityId,
						locationGroupLabel: l.locationGroupLabel,
						locationId: l.locationCommunityId,
						locationName: l.locationName,
						locationQuantity: l.quantity
					}];
				})) : [];

				// gets the attributes
				origChoice.jobChoiceAttributes && origChoice.jobChoiceAttributes.forEach(a =>
				{
					origSelectedAttributes.push({
						attributeId: a.attributeCommunityId,
						attributeGroupId: a.attributeGroupCommunityId,
						scenarioChoiceLocationId: a.id,
						attributeGroupLabel: a.attributeGroupLabel,
						attributeName: a.attributeName,
						sku: a.sku,
						manufacturer: a.manufacturer
					} as DesignToolAttribute);
				});

				if (origSelectedAttributes.length)
				{
					currentChoice.selectedAttributes = origSelectedAttributes;
				}

				if (origChoice.dpChoiceQuantity !== currentChoice.quantity)
				{
					selectedChoices.push({
						choiceId: currentChoice.id,
						quantity: origChoice.dpChoiceQuantity,
						attributes: currentChoice.selectedAttributes
					});
				}
			}
			else if (currentChoice.quantity > 0)
			{
				selectedChoices.push({
					choiceId: currentChoice.id,
					quantity: 0
				});
			}
		});

		return selectedChoices;
	}

	getLockedInChoices(job: Job, tree: Tree, changeOrder?: ChangeOrderGroup): Observable<Choice[]>
	{
		const treeChoices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));

		const choices = [
			...job.jobChoices.filter(jc => !changeOrder || !_.flatMap(changeOrder.jobChangeOrders.map(co => co.jobChangeOrderChoices)).some(coc => coc.action === 'Delete' && coc.dpChoiceId === jc.dpChoiceId)),
			...(changeOrder ? _.flatMap(changeOrder.jobChangeOrders.map(co => co.jobChangeOrderChoices.filter(c => c.action === 'Add'))) : [])
		];

		const changeOrderPlanOptions = changeOrder ? this.getJobChangeOrderPlanOptions(changeOrder) : null;
		const options = [...job.jobPlanOptions, ...((changeOrder && changeOrder.salesStatusDescription !== 'Pending') ? changeOrderPlanOptions : [])];

		return this._treeService.getHistoricOptionMapping(_.flatten(choices.map(c =>
		{
			if (isJobChoice(c))
			{
				return c.jobChoiceJobPlanOptionAssocs
					.filter(o => o.choiceEnabledOption)
					.map(o =>
					{
						return { optionNumber: options.find(opt => opt.id === o.jobPlanOptionId)?.integrationKey, dpChoiceId: c.dpChoiceId };
					});
			}
			else
			{
				return c.jobChangeOrderChoiceChangeOrderPlanOptionAssocs
					.filter(o => o.jobChoiceEnabledOption)
					.map(o =>
					{
						return { optionNumber: options.find(opt => opt.id === o.jobChangeOrderPlanOptionId)?.integrationKey, dpChoiceId: c.decisionPointChoiceID };
					});
			}
		}))).pipe(
			map(mapping =>
			{
				let lockedInChoices: Choice[] = [];
				choices.filter(isLocked(changeOrder)).forEach(choice =>
				{
					let treeChoice = treeChoices.find(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId);

					if (treeChoice)
					{
						let lockInChoice = _.cloneDeep(treeChoice);
						lockInChoice.lockedInChoice = choice;

						if (isJobChoice(choice))
						{
							lockInChoice.lockedInOptions = choice.jobChoiceJobPlanOptionAssocs.filter(o => o.choiceEnabledOption).map(o => mapping[options.find(opt => opt.id === o.jobPlanOptionId).integrationKey] || getDefaultOptionRule(options.find(opt => opt.id === o.jobPlanOptionId).integrationKey, lockInChoice));
						}
						else
						{
							lockInChoice.lockedInOptions = choice.jobChangeOrderChoiceChangeOrderPlanOptionAssocs.filter(o => o.jobChoiceEnabledOption).map(o => mapping[options.find(opt => opt.id === o.jobChangeOrderPlanOptionId).integrationKey] || getDefaultOptionRule(options.find(opt => opt.id === o.jobChangeOrderPlanOptionId).integrationKey, lockInChoice));
						}

						lockedInChoices.push(lockInChoice);
					}
				});

				return lockedInChoices;
			}),
			catchError(error =>
			{
				console.log(error);

				return _throw(error);
			})
		);
	}

	getSelectedChoices(job: Job, changeOrder?: ChangeOrderGroup): Array<JobChoice>
	{
		let jobChangeOrderChoices = [];

		if (changeOrder)
		{
			jobChangeOrderChoices = this.getJobChangeOrderChoices([changeOrder]);
		}

		let selectedChoices = _.cloneDeep(job.jobChoices);

		if (jobChangeOrderChoices.length > 0)
		{
			// Delete choices
			selectedChoices = selectedChoices.filter(c => !jobChangeOrderChoices.filter(c2 => c2.action === 'Delete').some(c2 => c2.dpChoiceId === c.dpChoiceId || c2.divChoiceCatalogId === c.divChoiceCatalogId));

			// Add choices
			selectedChoices = [...selectedChoices, ...jobChangeOrderChoices.filter(c => c.action === 'Add').map(coc =>
			{
				return <JobChoice>{
					id: coc.id,
					dpChoiceId: coc.decisionPointChoiceID,
					divChoiceCatalogId: coc.divChoiceCatalogId,
					dpChoiceQuantity: coc.quantity,
					jobChoiceAttributes: coc.jobChangeOrderChoiceAttributes && coc.jobChangeOrderChoiceAttributes.length
						? coc.jobChangeOrderChoiceAttributes.map(a => new JobChoiceAttribute(<JobChoiceAttribute>{
							attributeCommunityId: a.attributeCommunityId,
							attributeGroupCommunityId: a.attributeGroupCommunityId,
							id: a.id,
							attributeGroupLabel: a.attributeGroupLabel,
							attributeName: a.attributeName,
							manufacturer: a.manufacturer,
							sku: a.sku
						}))
						: [],
					jobChoiceLocations: coc.jobChangeOrderChoiceLocations && coc.jobChangeOrderChoiceLocations.length
						? coc.jobChangeOrderChoiceLocations.map(l => new JobChoiceLocation(<JobChoiceLocation>{
							id: l.id,
							locationCommunityId: l.locationCommunityId,
							locationGroupCommunityId: l.locationGroupCommunityId,
							quantity: l.quantity,
							locationGroupLabel: l.locationGroupLabel,
							locationName: l.locationName,
							jobChoiceLocationAttributes: l.jobChangeOrderChoiceLocationAttributes && l.jobChangeOrderChoiceLocationAttributes.length ?
								l.jobChangeOrderChoiceLocationAttributes.map(a => new JobChoiceAttribute(<JobChoiceAttribute>{
									attributeCommunityId: a.attributeCommunityId,
									attributeGroupCommunityId: a.attributeGroupCommunityId,
									id: a.id,
									attributeGroupLabel: a.attributeGroupLabel,
									attributeName: a.attributeName,
									manufacturer: a.manufacturer,
									sku: a.sku
								})) : []
						}))
						: []
				};
			})];

			// Update choices
			jobChangeOrderChoices.filter(c => c.action === 'Change').forEach(cco =>
			{
				let changedJobChoice = selectedChoices.find(sc => sc.divChoiceCatalogId === cco.divChoiceCatalogId);

				if (changedJobChoice)
				{
					this.mergeSelectedAttributes(changedJobChoice, cco);
					this.mergeSelectedLocations(changedJobChoice, cco);

					changedJobChoice.dpChoiceQuantity = cco.quantity;
				}
			});
		}

		return selectedChoices;
	}

	mergeSelectedAttributes(jobChoice: JobChoice, changeOrderChoice: ChangeOrderChoice)
	{
		const deletedAttributes = changeOrderChoice.jobChangeOrderChoiceAttributes.filter(x => x.action === 'Delete');

		deletedAttributes.forEach(attr =>
		{
			const deletedAttribute = jobChoice.jobChoiceAttributes.findIndex(
				d => d.attributeGroupCommunityId === attr.attributeGroupCommunityId && d.attributeCommunityId === attr.attributeCommunityId);

			if (deletedAttribute > -1)
			{
				jobChoice.jobChoiceAttributes.splice(deletedAttribute, 1);
			}
		});

		const addedAttributes = changeOrderChoice.jobChangeOrderChoiceAttributes.filter(x => x.action === 'Add');
		addedAttributes.forEach(attr =>
		{
			jobChoice.jobChoiceAttributes.push(
				new JobChoiceAttribute(<JobChoiceAttribute>{
					attributeCommunityId: attr.attributeCommunityId,
					attributeGroupCommunityId: attr.attributeGroupCommunityId,
					id: attr.id,
					attributeGroupLabel: attr.attributeGroupLabel,
					attributeName: attr.attributeName,
					manufacturer: attr.manufacturer,
					sku: attr.sku
				})
			);
		});
	}

	mergeSelectedLocations(jobChoice: JobChoice, changeOrderChoice: ChangeOrderChoice)
	{
		const deletedLocations = changeOrderChoice.jobChangeOrderChoiceLocations.filter(x => x.action === 'Delete');

		deletedLocations.forEach(loc =>
		{
			const deletedLocation = jobChoice.jobChoiceLocations.findIndex(
				d => d.locationGroupCommunityId === loc.locationGroupCommunityId && d.locationCommunityId === loc.locationCommunityId);

			if (deletedLocation > -1)
			{
				jobChoice.jobChoiceLocations.splice(deletedLocation, 1);
			}
		});

		const addedLocations = changeOrderChoice.jobChangeOrderChoiceLocations.filter(x => x.action === 'Add');

		addedLocations.forEach(loc =>
		{
			jobChoice.jobChoiceLocations.push(
				new JobChoiceLocation(<JobChoiceLocation>{
					id: loc.id,
					locationCommunityId: loc.locationCommunityId,
					locationGroupCommunityId: loc.locationGroupCommunityId,
					quantity: loc.quantity,
					locationGroupLabel: loc.locationGroupLabel,
					locationName: loc.locationName,
					jobChoiceLocationAttributes: loc.jobChangeOrderChoiceLocationAttributes && loc.jobChangeOrderChoiceLocationAttributes.length ?
						loc.jobChangeOrderChoiceLocationAttributes.map(a => new JobChoiceAttribute(<JobChoiceAttribute>{
							attributeCommunityId: a.attributeCommunityId,
							attributeGroupCommunityId: a.attributeGroupCommunityId,
							id: a.id,
							attributeGroupLabel: a.attributeGroupLabel,
							attributeName: a.attributeName,
							manufacturer: a.manufacturer,
							sku: a.sku
						})) : []
				})
			);
		});

		const changedLocations = changeOrderChoice.jobChangeOrderChoiceLocations.filter(x => x.action === 'Change');

		changedLocations.forEach(loc =>
		{
			const changedJobLocation = jobChoice.jobChoiceLocations.find(
				d => d.locationGroupCommunityId === loc.locationGroupCommunityId && d.locationCommunityId === loc.locationCommunityId);

			if (changedJobLocation)
			{
				this.mergeSelectedLocationAttributes(changedJobLocation, loc);
			}
		});
	}

	mergeSelectedLocationAttributes(jcLocation: JobChoiceLocation, cocLocation: ChangeOrderChoiceLocation)
	{
		const deletedAttributes = cocLocation.jobChangeOrderChoiceLocationAttributes.filter(x => x.action === 'Delete');

		deletedAttributes.forEach(attr =>
		{
			const deletedAttribute = jcLocation.jobChoiceLocationAttributes.findIndex(
				d => d.attributeGroupCommunityId === attr.attributeGroupCommunityId && d.attributeCommunityId === attr.attributeCommunityId);

			if (deletedAttribute > -1)
			{
				jcLocation.jobChoiceLocationAttributes.splice(deletedAttribute, 1);
			}
		});

		const addedAttributes = cocLocation.jobChangeOrderChoiceLocationAttributes.filter(x => x.action === 'Add');

		addedAttributes.forEach(attr =>
		{
			jcLocation.jobChoiceLocationAttributes.push(
				new JobChoiceAttribute(<JobChoiceAttribute>{
					attributeCommunityId: attr.attributeCommunityId,
					attributeGroupCommunityId: attr.attributeGroupCommunityId,
					id: attr.id,
					attributeGroupLabel: attr.attributeGroupLabel,
					attributeName: attr.attributeName,
					manufacturer: attr.manufacturer,
					sku: attr.sku
				})
			);
		});
	}

	getSelectedHanding(job: Job): ChangeOrderHanding
	{
		let handing = new ChangeOrderHanding();
		handing.handing = job.handing;
		const changeOrderGroup = job.changeOrderGroups.find(x =>
			x.salesStatusDescription !== 'Approved'
			&& x.salesStatusDescription !== 'Withdrawn'
			&& x.jobChangeOrders.some(co => co.jobChangeOrderTypeDescription === 'Handing' || co.jobChangeOrderTypeDescription === 'HomesiteTransfer'));

		if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
		{
			const handingChangeOrder = changeOrderGroup.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'Handing' || co.jobChangeOrderTypeDescription === 'HomesiteTransfer');

			if (handingChangeOrder)
			{
				const addHanding = handingChangeOrder.jobChangeOrderHandings.find(x => x.action === 'Add');

				if (addHanding)
				{
					handing = addHanding;
				}
				else
				{
					const deleteHanding = handingChangeOrder.jobChangeOrderHandings.find(x => x.action === 'Delete');

					if (deleteHanding && handing.handing === deleteHanding.handing)
					{
						handing = null;
					}
				}
			}
		}

		return handing;
	}

	getSelectedPlan(job: Job): number
	{
		let planId = job.planId;
		const changeOrderGroup = job.changeOrderGroups.find(x =>
			x.salesStatusDescription !== 'Approved'
			&& x.salesStatusDescription !== 'Withdrawn'
			&& x.jobChangeOrders.some(co => co.jobChangeOrderTypeDescription === 'Plan'));

		if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
		{
			const planChangeOrder = changeOrderGroup.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'Plan');

			if (planChangeOrder)
			{
				const addPlan = planChangeOrder.jobChangeOrderPlans.find(x => x.action === 'Add');

				if (addPlan)
				{
					planId = addPlan.planCommunityId;
				}
			}
		}

		return planId;
	}

	getSelectedLot(job: Job): number
	{
		let lotId = job.lotId;
		const changeOrderGroup = job.changeOrderGroups.find(x =>
			x.salesStatusDescription !== 'Approved'
			&& x.salesStatusDescription !== 'Withdrawn'
			&& x.jobChangeOrders.some(co => co.jobChangeOrderTypeDescription === 'HomesiteTransfer'));

		if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
		{
			const lotTransferChangeOrder = changeOrderGroup.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'HomesiteTransfer');

			if (lotTransferChangeOrder)
			{
				const addLot = lotTransferChangeOrder.jobChangeOrderLots.find(x => x.action === 'Add');

				if (addLot)
				{
					lotId = addLot.lotId;
				}
			}
		}

		return lotId;
	}

	getNonStandardChangeOrderData(jobId: number, salesAgreementId: number, currentChangeOrder: ChangeOrderGroup, options: Array<ChangeOrderNonStandardOption>): any
	{
		return {
			changeOrderGroupId: currentChangeOrder.id,
			changeOrderType: 'NonStandard',
			jobId: jobId,
			salesAgreementId: salesAgreementId,
			description: currentChangeOrder.jobChangeOrderGroupDescription,
			nonStandardOptions: options,
			note: currentChangeOrder.note ? currentChangeOrder.note.noteContent : null,
			changeOrderGroupSequence: currentChangeOrder.changeOrderGroupSequence,
			changeOrderGroupSequenceSuffix: currentChangeOrder.changeOrderGroupSequenceSuffix,
		};
	}

	getPlanChangeOrderData(tree: Tree, changeOrder: ChangeOrderGroup, job: Job, selectedPlanId: number, salesAgreementId: number, planPrice: number): any
	{
		const decisionPoints = (_.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || []).filter(x => x.dPointTypeId === 1 || x.dPointTypeId === 2);
		const currentChoices = _.flatMap(decisionPoints, pt => pt.choices) || [];
		const origChoices = job.jobChoices;
		const elevationDP = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).find(dp => dp.dPointTypeId === 1);
		const colorSchemeDP = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).find(dp => dp.dPointTypeId === 2);

		let plans = [];

		if (selectedPlanId && selectedPlanId !== job.planId)
		{
			let addId = 0;
			let deleteId = 0;

			if (changeOrder.jobChangeOrders && changeOrder.jobChangeOrders.length)
			{
				const planChangeOrder = changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'Plan');

				if (planChangeOrder)
				{
					const changeOrderPlans = changeOrder.jobChangeOrders[0].jobChangeOrderPlans;

					if (changeOrderPlans && changeOrderPlans.length)
					{
						const addedPlan = changeOrderPlans.find(x => x.action === 'Add');
						addId = addedPlan ? addedPlan.id : 0;
						const deletedPlan = changeOrderPlans.find(x => x.action === 'Delete');
						deleteId = deletedPlan ? deletedPlan.id : 0;
					}
				}
			}

			plans.push({
				id: addId,
				planCommunityId: selectedPlanId,
				action: 'Add'
			});

			plans.push({
				id: deleteId,
				planCommunityId: job.planId,
				action: 'Delete'
			});
		}

		return {
			changeOrderGroupId: changeOrder.id,
			changeOrderType: 'Plan',
			jobId: job.id,
			salesAgreementId: salesAgreementId,
			description: changeOrder.jobChangeOrderGroupDescription,
			note: changeOrder.note ? changeOrder.note.noteContent : null,
			overrideNote: changeOrder.overrideNote,
			changeOrderGroupSequence: changeOrder.changeOrderGroupSequence,
			changeOrderGroupSequenceSuffix: changeOrder.changeOrderGroupSequenceSuffix,
			plans: plans,
			choices: this.createPlanChangeOrderChoices(origChoices, currentChoices, job.jobPlanOptions, elevationDP, colorSchemeDP, tree),
			baseHouseOption: {
				price: planPrice,
			}
		};
	}

	private createPlanChangeOrderChoices(origChoices: Array<JobChoice>, currentChoices: Array<Choice>, jobOptions: Array<JobPlanOption>, elevationDP: DecisionPoint, colorSchemeDP: DecisionPoint, tree: Tree): Array<any>
	{
		let choicesDto = [];
		const currentSelectedChoices = currentChoices.filter(x => x.quantity > 0);

		currentSelectedChoices.forEach(cur =>
		{
			const labels = this.getChoiceLabels(cur, tree);

			// new choice
			choicesDto.push({
				dpChoiceId: cur.id,
				divChoiceCatalogId: cur.divChoiceCatalogId,
				dpChoiceQuantity: cur.quantity,
				dpChoiceCalculatedPrice: cur.price || 0,
				choiceLabel: cur.label,
				decisionPointLabel: labels.decisionPointLabel,
				subgroupLabel: labels.subgroupLabel,
				groupLabel: labels.groupLabel,
				overrideNote: cur.overrideNote,
				options: this.mapOptions(cur.options, cur.quantity, 'Add'),
				attributes: this.mapAttributes(cur, 'Add'),
				locations: this.mapLocations(cur, 'Add'),
				action: 'Add',
				isElevation: elevationDP ? cur.treePointId === elevationDP.id : false,
				isColorScheme: colorSchemeDP ? cur.treePointId === colorSchemeDP.id : false
			});
		});

		origChoices.forEach(orig =>
		{
			const labels = this.getChoiceLabels(orig, tree);
			const jobChoiceOptions = jobOptions.filter(x => x.jobOptionTypeName !== 'BaseHouse' && orig.jobChoiceJobPlanOptionAssocs.some(a => a.jobPlanOptionId === x.id));

			choicesDto.push({
				dpChoiceId: orig.dpChoiceId,
				divChoiceCatalogId: orig.divChoiceCatalogId,
				dpChoiceQuantity: orig.dpChoiceQuantity,
				dpChoiceCalculatedPrice: orig.dpChoiceCalculatedPrice || 0,
				choiceLabel: orig.choiceLabel,
				decisionPointLabel: labels ? labels.decisionPointLabel : '',
				subgroupLabel: labels ? labels.subgroupLabel : '',
				groupLabel: labels ? labels.groupLabel : '',
				options: this.mapOptions(jobChoiceOptions, orig.dpChoiceQuantity, 'Delete'),
				attributes: this.mapJobChoiceAttributes(orig.jobChoiceAttributes, 'Delete'),
				locations: this.mapJobChoiceLocations(orig.jobChoiceLocations, 'Delete'),
				action: 'Delete'
			});
		});

		return choicesDto;
	}

	getLotTransferChangeOrderData(jobId: number, salesAgreementId: number, currentChangeOrder: ChangeOrderGroup, handing: string): any
	{
		const lotTransferChangeOrder = currentChangeOrder && currentChangeOrder.jobChangeOrders && currentChangeOrder.jobChangeOrders.length
			? currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'HomesiteTransfer')
			: null;

		var data: any = {
			changeOrderGroupId: currentChangeOrder.id,
			changeOrderType: 'LotTransfer',
			jobId: jobId,
			salesAgreementId: salesAgreementId,
			description: currentChangeOrder.jobChangeOrderGroupDescription,
			note: currentChangeOrder.note ? currentChangeOrder.note.noteContent : null,
			overrideNote: currentChangeOrder.overrideNote,
			changeOrderGroupSequence: currentChangeOrder.changeOrderGroupSequence,
			changeOrderGroupSequenceSuffix: currentChangeOrder.changeOrderGroupSequenceSuffix
		};

		if (lotTransferChangeOrder && lotTransferChangeOrder.jobChangeOrderLots && lotTransferChangeOrder.jobChangeOrderLots.length)
		{
			data.lots = lotTransferChangeOrder.jobChangeOrderLots;
		}

		if (handing)
		{
			data.handings = [{ handing: handing, action: 'Add' }];
		}

		return data;
	}

	getOriginalPlan(plans: Array<Plan>, currentChangeOrder: any, jobPlanId: number)
	{
		const planChangeOrder = currentChangeOrder && currentChangeOrder.jobChangeOrders && currentChangeOrder.jobChangeOrders.length && currentChangeOrder.jobChangeOrders[0].jobChangeOrderPlans
			? currentChangeOrder.jobChangeOrders[0].jobChangeOrderPlans.find(x => x.id && x.action === 'Add')
			: null;

		const planId = planChangeOrder ? planChangeOrder.planCommunityId : jobPlanId;

		return planId && plans ? plans.find(x => x.id === planId) : null;
	}

	getOriginalLotId(job: Job)
	{
		const pendingChangeOrderGroup = job.changeOrderGroups && job.changeOrderGroups.length
			? job.changeOrderGroups.find(x => x.salesStatusDescription !== 'Approved' && x.salesStatusDescription !== 'Withdrawn')
			: null;

		const lotTransferChangeOrder = pendingChangeOrderGroup && pendingChangeOrderGroup.jobChangeOrders && pendingChangeOrderGroup.jobChangeOrders.length
			? pendingChangeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'HomesiteTransfer')
			: null;

		const changeOrderLot = lotTransferChangeOrder && lotTransferChangeOrder.jobChangeOrderLots && lotTransferChangeOrder.jobChangeOrderLots.length
			? lotTransferChangeOrder.jobChangeOrderLots.find(x => x.id && x.action === 'Add')
			: null;

		return changeOrderLot ? changeOrderLot.lotId : job.lotId;
	}

	getCurrentChangeOrder(changeOrderGroups: Array<ChangeOrderGroup>): ChangeOrderGroup
	{
		let pendingChangeOrderGroups = changeOrderGroups.filter(co => ['Withdrawn', 'Resolved'].indexOf(co.salesStatusDescription) === -1 && (co.salesStatusDescription !== 'Approved' || co.constructionStatusDescription === 'Pending'));

		//this should change or go away afer we're only dealing with one type of change order
		let jobChangeOrderGroup = pendingChangeOrderGroups.find(co =>
			co.jobChangeOrders && co.jobChangeOrders.length &&
			['ChoiceAttribute', 'Elevation', 'Handing', 'SalesJIO', 'SpecJIO'].indexOf(co.jobChangeOrders[0].jobChangeOrderTypeDescription) !== -1);

		if (!jobChangeOrderGroup && pendingChangeOrderGroups.length)
		{
			jobChangeOrderGroup = pendingChangeOrderGroups[0];
		}

		return jobChangeOrderGroup;
	}

	mergeSalesChangeOrderBuyers(salesAgreementBuyers: Array<Buyer>, currentChangeOrder: ChangeOrderGroup): Array<Buyer>
	{
		let buyers = _.cloneDeep(salesAgreementBuyers);
		const buyerChangeOrder = currentChangeOrder && currentChangeOrder.jobChangeOrders
			? currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'BuyerChangeOrder')
			: null;

		if (buyerChangeOrder && buyerChangeOrder.jobSalesChangeOrderBuyers)
		{
			const deletedBuyers = buyerChangeOrder.jobSalesChangeOrderBuyers.filter(x => x.action === 'Delete');

			deletedBuyers.forEach(b =>
			{
				const deletedBuyer = buyers.findIndex(x => x.opportunityContactAssoc.id === b.opportunityContactAssoc.id);

				if (deletedBuyer > -1)
				{
					buyers.splice(deletedBuyer, 1);
				}
			});

			const addedBuyers = buyerChangeOrder.jobSalesChangeOrderBuyers.filter(x => x.action === 'Add');

			addedBuyers.forEach(b =>
			{
				let buyer = _.cloneDeep(b);

				if (buyer.opportunityContactAssoc && buyer.opportunityContactAssoc.contact)
				{
					buyer.opportunityContactAssoc.contact.firstName = b.firstName;
					buyer.opportunityContactAssoc.contact.middleName = b.middleName;
					buyer.opportunityContactAssoc.contact.lastName = b.lastName;
					buyer.opportunityContactAssoc.contact.suffix = b.suffix;
				}
				buyers.push(buyer);
			});

			const updatedBuyers = buyerChangeOrder.jobSalesChangeOrderBuyers.filter(x => x.action === 'Change');
			updatedBuyers.forEach(updatedBuyer =>
			{
				let buyer = buyers.find(x => x.opportunityContactAssoc.id === updatedBuyer.opportunityContactAssoc.id);

				if (buyer && buyer.opportunityContactAssoc && buyer.opportunityContactAssoc.contact)
				{
					if (buyer.opportunityContactAssoc.contact)
					{
						buyer.opportunityContactAssoc.contact.firstName = updatedBuyer.firstName;
						buyer.opportunityContactAssoc.contact.middleName = updatedBuyer.middleName;
						buyer.opportunityContactAssoc.contact.lastName = updatedBuyer.lastName;
						buyer.opportunityContactAssoc.contact.suffix = updatedBuyer.suffix;
					}
				}
			});
		}

		return buyers;
	}

	mergeSalesChangeOrderTrusts(salesAgreement: SalesAgreement, currentChangeOrder: ChangeOrderGroup)
	{
		let trustName = salesAgreement.trustName;
		let isTrustNa = salesAgreement['isTrustNa'];

		const existingTrust = this.getExistingChangeOrderTrusts(currentChangeOrder);

		if (existingTrust.deletedTrust)
		{
			trustName = null;
		}

		if (existingTrust.addedTrust)
		{
			trustName = existingTrust.addedTrust.trustName;
		}

		if (trustName !== salesAgreement.trustName)
		{
			isTrustNa = !trustName;
		}

		return {
			trustName: trustName,
			isTrustNa: isTrustNa
		}
	}

	// Return change order choices from both the ChoiceAttribute change order and the Elevation change order
	getJobChangeOrderChoices(changeOrderGroups: Array<ChangeOrderGroup>): Array<ChangeOrderChoice>
	{
		let jobChangeOrderChoices = [];

		changeOrderGroups.forEach(changeOrderGroup =>
		{
			if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
			{
				const salesJIOChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'SalesJIO');

				if (salesJIOChangeOrder)
				{
					jobChangeOrderChoices = [...jobChangeOrderChoices, ...salesJIOChangeOrder.jobChangeOrderChoices];
				}

				const choiceChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'ChoiceAttribute');

				if (choiceChangeOrder)
				{
					jobChangeOrderChoices = [...jobChangeOrderChoices, ...choiceChangeOrder.jobChangeOrderChoices];
				}

				const elevationChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'Elevation');

				if (elevationChangeOrder)
				{
					jobChangeOrderChoices = [...jobChangeOrderChoices, ...elevationChangeOrder.jobChangeOrderChoices];
				}

				const planChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'Plan');

				if (planChangeOrder)
				{
					jobChangeOrderChoices = [...jobChangeOrderChoices, ...planChangeOrder.jobChangeOrderChoices];
				}
			}
		})

		return jobChangeOrderChoices;
	}

	// Return change order plan options from both the ChoiceAttribute change order and the Elevation change order
	getJobChangeOrderPlanOptions(changeOrderGroup: ChangeOrderGroup): Array<ChangeOrderPlanOption>
	{
		let jobChangeOrderPlanOptions = [];

		if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
		{
			const jioChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'SalesJIO');

			if (jioChangeOrder)
			{
				jobChangeOrderPlanOptions = [...jioChangeOrder.jobChangeOrderPlanOptions];
			}

			const choiceChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'ChoiceAttribute');

			if (choiceChangeOrder)
			{
				jobChangeOrderPlanOptions = [...choiceChangeOrder.jobChangeOrderPlanOptions];
			}

			const elevationChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'Elevation');

			if (elevationChangeOrder)
			{
				jobChangeOrderPlanOptions = [...jobChangeOrderPlanOptions, ...elevationChangeOrder.jobChangeOrderPlanOptions];
			}
		}

		return jobChangeOrderPlanOptions;
	}

	createCancellationChangeOrder(jobId: number, salesAgreementId: number, changeOrderGroupSequence: number): Observable<ChangeOrderGroup>
	{
		let url = environment.apiUrl + `CreateOrUpdateChangeOrder`;

		let data = {
			changeOrderGroupId: 0,
			jobId: jobId,
			changeOrderType: 'Cancellation',
			description: 'Cancellation',
			salesAgreementId: salesAgreementId,
			changeOrderGroupSequence: changeOrderGroupSequence
		};

		return this._http.post(url, { changeOrderDto: data, changePrice: 0 }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((response: any) =>
			{
				return new ChangeOrderGroup(response);
			}),
			catchError(error =>
			{
				console.log(error);

				return _throw(error);
			})
		);
	}

	mergePosData(data: any, currentChangeOrder: ChangeOrderGroup, salesAgreement: SalesAgreement, changeInput: ChangeInput, jobId: number, specSale?: boolean): any
	{
		let result = _.cloneDeep(data);

		if (salesAgreement && salesAgreement.id > 0)
		{
			const salesData = this.getSalesChangeOrderData(currentChangeOrder, salesAgreement, changeInput, jobId, specSale);

			if (salesData.salesChangeOrderPriceAdjustments && salesData.salesChangeOrderPriceAdjustments.length)
			{
				result.salesChangeOrderPriceAdjustments = salesData.salesChangeOrderPriceAdjustments;
			}

			if (salesData.salesChangeOrderSalesPrograms && salesData.salesChangeOrderSalesPrograms.length)
			{
				result.salesChangeOrderSalesPrograms = salesData.salesChangeOrderSalesPrograms;
			}

			if (salesData.salesChangeOrderBuyers && salesData.salesChangeOrderBuyers.length)
			{
				result.salesChangeOrderBuyers = salesData.salesChangeOrderBuyers;
			}

			if (salesData.salesChangeOrderTrusts && salesData.salesChangeOrderTrusts.length)
			{
				result.salesChangeOrderTrusts = salesData.salesChangeOrderTrusts;
			}

			if (salesData.salesNotesChangeOrders && salesData.salesNotesChangeOrders.length)
			{
				result.salesNotesChangeOrders = salesData.salesNotesChangeOrders;
			}
		}

		return result;
	}

	getTypeFromChangeOrderGroup(changeOrderGroup: ChangeOrderGroup): string
	{
		if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
		{
			const nonSalesChangeOrders = changeOrderGroup.jobChangeOrders.filter(x => x.jobChangeOrderTypeDescription !== 'BuyerChangeOrder' && x.jobChangeOrderTypeDescription !== 'PriceAdjustment');

			if (nonSalesChangeOrders && nonSalesChangeOrders.length)
			{
				const lotTransferChangeOrder = nonSalesChangeOrders.filter(x => x.jobChangeOrderTypeDescription === 'HomesiteTransfer');

				if (lotTransferChangeOrder && lotTransferChangeOrder.length)
				{
					return lotTransferChangeOrder[0].jobChangeOrderTypeDescription;
				}

				return nonSalesChangeOrders[0].jobChangeOrderTypeDescription;
			}

			return changeOrderGroup.jobChangeOrders[0].jobChangeOrderTypeDescription;
		}

		return null;
	}

	changeOrderHasChanges(tree: Tree, job: Job, currentChangeOrder: ChangeOrderGroup, changeInput: ChangeInput, salesAgreement: SalesAgreement): boolean
	{
		if (changeInput.type === ChangeTypeEnum.SALES)
		{
			const data = this.getSalesChangeOrderData(currentChangeOrder, salesAgreement, changeInput, job.id, false);
			return (data.salesChangeOrderPriceAdjustments && data.salesChangeOrderPriceAdjustments.length)
				|| (data.salesChangeOrderSalesPrograms && data.salesChangeOrderSalesPrograms.length)
				|| (data.salesChangeOrderBuyers && data.salesChangeOrderBuyers.length)
				|| (data.salesChangeOrderTrusts && data.salesChangeOrderTrusts.length)
				|| (data.salesNotesChangeOrders && data.salesNotesChangeOrders.length);
		}
		else if (changeInput.type === ChangeTypeEnum.NON_STANDARD)
		{
			const options = currentChangeOrder.jobChangeOrders.find(t => t.jobChangeOrderTypeDescription === 'NonStandard').jobChangeOrderNonStandardOptions;
			const inputData = this.getNonStandardChangeOrderData(
				job.id,
				salesAgreement.id,
				currentChangeOrder,
				options);
			const data = this.mergePosData(
				inputData,
				currentChangeOrder,
				salesAgreement,
				changeInput,
				job.id);

			return (options && !!options.length)
				|| (data.salesChangeOrderPriceAdjustments && data.salesChangeOrderPriceAdjustments.length)
				|| (data.salesChangeOrderSalesPrograms && data.salesChangeOrderSalesPrograms.length)
				|| (data.salesChangeOrderBuyers && data.salesChangeOrderBuyers.length)
				|| (data.salesChangeOrderTrusts && data.salesChangeOrderTrusts.length);
		}
		else
		{
			const baseHouseOption = job.jobPlanOptions ? job.jobPlanOptions.find(x => x.jobOptionTypeName === 'BaseHouse') : null;
			const inputData = this.getJobChangeOrderInputData(
				tree,
				currentChangeOrder,
				job,
				changeInput.handing,
				salesAgreement.id,
				baseHouseOption);
			const data = this.mergePosData(
				inputData,
				currentChangeOrder,
				salesAgreement,
				changeInput,
				job.id);
			return (data.choices && data.choices.length)
				|| (data.handings && data.handings.length)
				|| (data.salesChangeOrderPriceAdjustments && data.salesChangeOrderPriceAdjustments.length)
				|| (data.salesChangeOrderSalesPrograms && data.salesChangeOrderSalesPrograms.length)
				|| (data.salesChangeOrderBuyers && data.salesChangeOrderBuyers.length)
				|| (data.salesChangeOrderTrusts && data.salesChangeOrderTrusts.length);
		}
	}

	private getChoiceLabels(choice: Choice | JobChoice, tree: Tree): ChoiceExt
	{

		let pointId: number = 0;

		if (choice instanceof Choice)
		{
			pointId = choice.treePointId;
		}
		else
		{
			const choices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));
			const ch = choices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId);

			if (ch)
			{
				pointId = ch.treePointId;
			}
		}

		return tree.treeVersion.groups.reduce((val: ChoiceExt, g) =>
		{
			let result = g.subGroups.reduce((sgVal: ChoiceExt, sg) =>
			{
				let p = sg.points.find(p => p.id === pointId);

				if (!!p)
				{
					return { decisionPointLabel: p.label, subgroupLabel: sg.label, groupLabel: g.label };
				}
				else
				{
					return sgVal;
				}
			}, null);

			if (!!result)
			{
				return result;
			}
			else
			{
				return val;
			}
		}, null);
	}
}
