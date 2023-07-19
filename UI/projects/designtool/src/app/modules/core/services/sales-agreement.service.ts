import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw, of } from 'rxjs';
import { flatMap, map, switchMap, catchError } from 'rxjs/operators';

import * as _ from 'lodash';

import
	{
		defaultOnNotFound, newGuid, getNewGuid, createBatchPatchWithAuth, createBatchGet, createBatchBody, createBatchHeaders, parseBatchResults,
		removeProperty, withSpinner, Buyer, IBuyer, Contact, Job, IJob, Note, PlanOption, SalesAgreement, ISalesAgreement,
		SalesAgreementInfo, Realtor, ISalesAgreementInfo, IRealtor, SalesAgreementProgram, SalesAgreementDeposit, SalesAgreementContingency,
		ISalesAgreementCancelVoidInfo, SalesAgreementCancelVoidInfo, Consultant, ISalesAgreementSalesConsultantDto,
		Scenario, SelectedChoice, Tree, Choice, IdentityService, OptionRule, DecisionPoint, IPendingJobSummary
	} from 'phd-common';

import { environment } from '../../../../environments/environment';

//Imports to support Voiding of Sales Agreement
import { Store } from '@ngrx/store';
import * as fromRoot from '../../ngrx-store/reducers';

import { getJobOptionType } from '../../shared/classes/tree.utils';

@Injectable()
export class SalesAgreementService
{
	private _ds: string = encodeURIComponent("$");
	private _batch = "$batch";

	constructor(
		private store: Store<fromRoot.State>,
		private _identityService: IdentityService,
		private _http: HttpClient) { }

	getSalesAgreement(salesAgreementId: number): Observable<SalesAgreement>
	{
		return this._identityService.token.pipe(
			switchMap((token: string) =>
			{
				const entity = `salesAgreements(${salesAgreementId})`;
				const expands = `programs($select=id,salesAgreementId,salesProgramId,salesProgramDescription,amount;$expand=salesProgram($select=id, salesProgramType, name)),deposits,contingencies,salesAgreementNoteAssocs($expand=note($expand=noteTargetAudienceAssocs($expand=targetAudience)))`;
				const expandCancellations = `cancellations($expand=note($select=id,noteContent);$select=salesAgreementId,cancelReasonDesc,voidReasonDesc,noteId)`;
				const expandRealtors = `realtors($expand=contact($select=id,prefix,firstName,middleName,lastName,suffix,preferredCommunicationMethod,dynamicsIntegrationKey;$expand=addressAssocs($expand=address),phoneAssocs($expand=phone),emailAssocs($expand=email),realEstateAgents($top=1)))`;
				const expandBuyers = `buyers($expand=opportunityContactAssoc($expand=opportunity($select=dynamicsOpportunityId,salesCommunityId),contact($select=id,prefix,firstName,middleName,lastName,suffix,preferredCommunicationMethod,dynamicsIntegrationKey;$expand=addressAssocs($expand=address),phoneAssocs($expand=phone),emailAssocs($expand=email))))`;
				const expandConsultants = `consultants($expand=contact($select=id,prefix,firstName,middleName,lastName,suffix,preferredCommunicationMethod,dynamicsIntegrationKey;$expand=emailAssocs($expand=email)))`;
				const expandJobAssocs = `jobSalesAgreementAssocs($select=jobId;$orderby=createdUtcDate desc;$top=1)`;
				const expandPriceAdjustments = `salesAgreementPriceAdjustmentAssocs($select=id,salesAgreementId,priceAdjustmentType,amount)`;

				let guid = newGuid();
				let requestBundles: string[] = [];
				let newRequest = (select: string, expand: string) =>
				{
					if (select)
					{
						select = `${this._ds}select=${select}`;
					}
					let batch = `${environment.apiUrl}${entity}?${select}&${this._ds}expand=${expand}`;

					requestBundles.push(batch);
				};

				newRequest('', `${expands},${expandCancellations},${expandJobAssocs}`);
				newRequest(`id`, expandRealtors);
				newRequest(`id`, expandBuyers);
				newRequest(`id`, expandConsultants);
				newRequest(`id`, expandPriceAdjustments);

				let batchRequests = requestBundles.map(req => createBatchGet(req));

				var headers = createBatchHeaders(guid, token);
				var batch = createBatchBody(guid, batchRequests);

				return this._http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				let data: ISalesAgreement[] = response.responses.map(r => r.body);

				if (data.length === 0)
				{
					return new SalesAgreement();
				}

				//get main salesAgreement
				let iSalesAgreement = data.find(x => x?.salesAgreementNumber?.length > 0);

				//find and assign the realtor records
				iSalesAgreement.realtors = data.find(x => x.realtors != null)?.realtors;

				//find and assign the buyer records
				iSalesAgreement.buyers = data.find(x => x.buyers != null)?.buyers;

				//find and assign the consultant records
				iSalesAgreement.consultants = data.find(x => x.consultants != null)?.consultants;

				//find and assign the priceAdjustment records
				iSalesAgreement.salesAgreementPriceAdjustmentAssocs = data.find(x => x.salesAgreementPriceAdjustmentAssocs != null)?.salesAgreementPriceAdjustmentAssocs;

				return new SalesAgreement(iSalesAgreement);
			}),
			catchError(error =>
			{
				console.error(error);
				return _throw(error);
			})
		);
	}

	getSalesAgreementInfo(salesAgreementId: number): Observable<SalesAgreementInfo>
	{
		const entity = `salesAgreementInfos(${salesAgreementId})`;
		const endpoint = environment.apiUrl + entity;

		return this._http.get<ISalesAgreementInfo>(endpoint).pipe(
			map(dto => new SalesAgreementInfo(dto)),
			defaultOnNotFound("getSalesAgreementInfo", new SalesAgreementInfo())
		);
	}

	getSalesAgreementBuyers(salesAgreementId: number): Observable<Array<Buyer>>
	{
		const entity = `salesAgreements(${salesAgreementId})/buyers`;
		const expand = `opportunityContactAssoc($expand=contact($expand=addressAssocs($expand=address),phoneAssocs($expand=phone),emailAssocs($expand=email)),opportunity($select=dynamicsOpportunityId,salesCommunityId))`;
		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(result =>
			{
				const dtos = result.value as Array<IBuyer>;

				return dtos.map(buyerDto => new Buyer(buyerDto));
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getSalesAgreementConsultants(salesAgreementId: number): Observable<Array<Consultant>>
	{
		const entity = `salesAgreements(${salesAgreementId})/consultants`;
		const expand = `contact($expand=emailAssocs($expand=email))`;
		const select = `id,commission,isPrimary`;
		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(result =>
			{
				const dtos = result.value as Array<Consultant>;

				return dtos.map(consultantDto => new Consultant(consultantDto));
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getSalesAgreementRealtor(salesAgreementId: number): Observable<Realtor>
	{
		const entity = `salesAgreements(${salesAgreementId})/realtors`;
		const expand = `contact($expand=addressAssocs($expand=address),phoneAssocs($expand=phone),emailAssocs($expand=email))`;
		const select = `salesAgreementId,contactId,brokerName`;
		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<IRealtor>(url).pipe(
			map(dto =>
			{
				return dto ? new Realtor(dto) : null;
			}),
			defaultOnNotFound("getSalesAgreementRealtor")
		);
	}

	getSalesAgreementBuyer(salesAgreementId: number, buyerId: number): Observable<Buyer>
	{
		const entity = `salesAgreements(${salesAgreementId})/buyers(${buyerId})`;
		const expand = `opportunityContactAssoc($expand=contact($expand=addressAssocs($expand=address),phoneAssocs($expand=phone),emailAssocs($expand=email)),opportunity)`;
		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<IBuyer>(url).pipe(
			map(dto => new Buyer(dto)),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	createSalesAgreementForScenario(
		scenario: Scenario, 
		tree: Tree, 
		baseHouseOption: PlanOption, 
		salePrice: number, 
		optionRules: OptionRule[],
		pendingJobSummary: IPendingJobSummary
	): Observable<SalesAgreement>
	{
		const action = `CreateSalesAgreementForScenario`;
		const url = `${environment.apiUrl}${action}`;
		const elevationDP = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).find(dp => dp.dPointTypeId === 1);
		const colorSchemeDP = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).find(dp => dp.dPointTypeId === 2);
		const choices = _.flatMap(
			tree.treeVersion.groups,
			g => _.flatMap(
				g.subGroups,
				sg => _.flatMap(
					sg.points,
					pt => pt.choices.filter(c => c.quantity > 0).map(c => ({ choice: c, pointLabel: pt.label, subgroupLabel: sg.label, groupLabel: g.label, divChoiceCatalogId: c.divChoiceCatalogId }))
				)
			)
		);

		const data = {
			scenarioId: scenario.scenarioId,
			choices: choices.map(c =>
			{
				const isColorScheme = colorSchemeDP ? c.choice.treePointId === colorSchemeDP.id : false;
				const isDPElevation = elevationDP ? c.choice.treePointId === elevationDP.id : false;

				return {
					dpChoiceId: c.choice.id,
					divChoiceCatalogId: c.divChoiceCatalogId,
					dpChoiceQuantity: c.choice.quantity,
					dpChoiceCalculatedPrice: c.choice.price || 0,
					choiceLabel: c.choice.label,
					pointLabel: c.pointLabel,
					subgroupLabel: c.subgroupLabel,
					groupLabel: c.groupLabel,
					overrideNote: c.choice.overrideNote,
					options: this.mapOptions(c.choice, elevationDP, isDPElevation, isColorScheme, tree, optionRules),
					attributes: this.mapAttributes(c.choice),
					locations: this.mapLocations(c.choice),
					isElevation: isDPElevation,
					isColorScheme: isColorScheme,
					action: 'Add'
				};
			}),
			baseHouseOption: {
				planOptionId: baseHouseOption.id,
				price: baseHouseOption.listPrice,
				quantity: 1,
				optionSalesName: baseHouseOption.name,
				optionDescription: baseHouseOption.description
			},
			salePrice: salePrice,
			pendingJobSummary: pendingJobSummary
		};

		return this._http.post<ISalesAgreement>(url, data).pipe(
			map(dto => new SalesAgreement(dto)),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	updateSalesAgreement(agreement: ISalesAgreement): Observable<SalesAgreement>
	{
		const excludedProperties: Array<string> = ['programs', 'buyers', 'realtors', 'deposits', 'contingencies', 'notes', 'consultants', 'changeOrderGroupSalesAgreementAssocs', 'salesChangeOrders', 'jobSalesAgreementAssocs'];

		// if the sales agreement object has programs/buyers/realtors, remove them since they are managed elsewhere
		let salesAgreement: ISalesAgreement = _.omit(agreement, excludedProperties);

		// Also remove any properties with undefined or null values
		salesAgreement = _.omitBy(salesAgreement, _.isNil);

		const entity = `salesAgreements(${salesAgreement.id})`;
		const endpoint = environment.apiUrl + entity;

		return this._http.patch<ISalesAgreement>(endpoint, salesAgreement, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(dto => new SalesAgreement(dto)),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	addUpdateSalesAgreementBuyer(salesAgreementId: number, buyer: Buyer): Observable<Buyer>
	{
		const action = `AddUpdateSalesAgreementBuyer`;
		const endpoint = `${environment.apiUrl}${action}`;

		let contact = { ...buyer.opportunityContactAssoc.contact } as Contact;

		contact = removeProperty(contact, 'addressAssocs');
		contact = removeProperty(contact, 'emailAssocs');
		contact = removeProperty(contact, 'phoneAssocs');
		contact = removeProperty(contact, 'realEstateAgents');

		const data = {
			salesAgreementId: salesAgreementId,
			buyer: {
				...buyer,
				opportunityContactAssoc: { ...buyer.opportunityContactAssoc, contact: { ...contact } }
			},
			addressAssocs: buyer.opportunityContactAssoc.contact.addressAssocs,
			emailAssocs: buyer.opportunityContactAssoc.contact.emailAssocs,
			phoneAssocs: buyer.opportunityContactAssoc.contact.phoneAssocs
		};

		return this._http.post<IBuyer>(endpoint, data).pipe(
			map(dto => new Buyer(dto))
			, catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	addUpdateSalesAgreementRealtor(salesAgreementId: number, realtor: Realtor): Observable<Realtor>
	{
		const action = `AddUpdateSalesAgreementRealtor`;
		const endpoint = `${environment.apiUrl}${action}`;

		let contact = { ...realtor.contact } as Contact;

		contact = removeProperty(contact, 'addressAssocs');
		contact = removeProperty(contact, 'emailAssocs');
		contact = removeProperty(contact, 'phoneAssocs');
		contact = removeProperty(contact, 'realEstateAgents');

		const data = {
			salesAgreementId: salesAgreementId,
			realtor: { ...realtor, contact: contact },
			addressAssocs: realtor.contact.addressAssocs,
			emailAssocs: realtor.contact.emailAssocs,
			phoneAssocs: realtor.contact.phoneAssocs
		};

		return this._http.post<IRealtor>(endpoint, data).pipe(
			map(dto => new Realtor(dto)),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	patchSalesAgreementBuyer(salesAgreementId: number, buyer: Buyer): Observable<Buyer>
	{
		const entity = `salesAgreements(${salesAgreementId})/buyers(${buyer.id})`;
		const endpoint = environment.apiUrl + entity;

		const data: IBuyer = {
			id: buyer.id,
			isPrimaryBuyer: buyer && buyer.isPrimaryBuyer,
			sortKey: buyer.sortKey
		};

		return this._http.patch<IBuyer>(endpoint, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response => buyer),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveSalesAgreementInfo(salesAgreementInfo: SalesAgreementInfo): Observable<SalesAgreementInfo>
	{
		const entity = `salesAgreementInfos(${salesAgreementInfo.edhSalesAgreementId})`;
		const endpoint = environment.apiUrl + entity;

		return this._http.patch<ISalesAgreementInfo>(endpoint, salesAgreementInfo, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(dto => new SalesAgreementInfo(dto)),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	deleteBuyer(salesAgreementId: number, buyerId: number): Observable<number>
	{
		const entity = `salesAgreements(${salesAgreementId})/buyers(${buyerId})`;
		const endpoint = environment.apiUrl + entity;

		return this._http.delete(endpoint, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response => buyerId),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	/**
	 * source buyer becomes the new primary buyer.
	 * old primary buyer takes the sort key of the source buyer.
	 * @param salesAgreementId
	 * @param sourceBuyer
	 * @param targetBuyer
	 */
	saveSwapPrimaryBuyer(salesAgreementId: number, sourceBuyer: Buyer, targetBuyer: Buyer): Observable<{ oldPrimaryBuyer: Buyer, newPrimaryBuyer: Buyer }>
	{
		return this._identityService.token.pipe(
			flatMap((token: string) =>
			{
				const oldPrimaryBuyer: Buyer = { ...targetBuyer, isPrimaryBuyer: false, sortKey: sourceBuyer.sortKey };
				const newPrimaryBuyer: Buyer = { ...sourceBuyer, isPrimaryBuyer: true, sortKey: 0 };

				const batchRequests = [createBatchPatchWithAuth<Buyer>(token, [oldPrimaryBuyer, newPrimaryBuyer], 'id', `salesAgreements(${salesAgreementId})/buyers`, 'isPrimaryBuyer', 'sortKey')];
				const batchGuid = getNewGuid();
				const batchBody = createBatchBody(batchGuid, batchRequests);
				const headers = new HttpHeaders(createBatchHeaders(batchGuid, token));

				const endPoint = `${environment.apiUrl}${this._batch}`;

				return this._http.post(endPoint, batchBody, { headers, responseType: 'text' });
			})
			, map((response: string) =>
			{
				// calling parseBatchResults will will throw an error if it finds a 400 or 500 error in the response
				// note: currently patch on salesAgreements/buyers is only receiving a http status back from EDH
				parseBatchResults(response);

				const oldPrimaryBuyer: Buyer = { ...targetBuyer, isPrimaryBuyer: false, sortKey: sourceBuyer.sortKey };
				const newPrimaryBuyer: Buyer = { ...sourceBuyer, isPrimaryBuyer: true, sortKey: 0 };

				return { oldPrimaryBuyer: oldPrimaryBuyer, newPrimaryBuyer: newPrimaryBuyer };
			})
			, catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveReSortedBuyers(salesAgreementId: number, buyers: Array<Buyer>): Observable<Array<Buyer>>
	{
		return this._identityService.token.pipe(
			flatMap((token: string) =>
			{
				const batchRequests = [createBatchPatchWithAuth<Buyer>(token, buyers, 'id', `salesAgreements(${salesAgreementId})/buyers`, 'sortKey')];
				const batchGuid = getNewGuid();
				const batchBody = createBatchBody(batchGuid, batchRequests);
				const headers = new HttpHeaders(createBatchHeaders(batchGuid, token));

				const endPoint = `${environment.apiUrl}${this._batch}`;

				return this._http.post(endPoint, batchBody, { headers, responseType: 'text' });
			})
			, map((response: string) =>
			{
				// calling parseBatchResults will will throw an error if it finds a 400 or 500 error in the response
				// note: currently patch on salesAgreements/buyers is only receiving a http status back from EDH
				parseBatchResults(response);

				return buyers;
			})
			, catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	deleteProgram(salesAgreementId: number, programId: number): Observable<number>
	{
		const entity = `salesAgreements(${salesAgreementId})/programs(${programId})`;
		const endpoint = environment.apiUrl + entity;

		return this._http.delete(endpoint).pipe(
			map(response => programId),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveProgram(program: SalesAgreementProgram): Observable<SalesAgreementProgram>
	{
		let omitId = program.id && program.id === 0 ? 'id' : '';

		//clone but leave out salesPrograms and maybe Id if needed.
		const oldProgram: SalesAgreementProgram = _.omit(program, ['salesProgram', omitId]);

		const entity = `salesAgreements(${program.salesAgreementId})/programs` + (oldProgram.id ? `(${oldProgram.id})` : '');
		const endpoint = environment.apiUrl + entity;
		const method = oldProgram.id ? 'patch' : 'post';

		// OData will not accept an id with 0 if we're trying to patch.
		return this._http[method](endpoint, oldProgram, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((dto: SalesAgreementProgram) =>
			{
				let newProgram = new SalesAgreementProgram(dto);

				newProgram.salesProgram = program.salesProgram;

				return newProgram;
			}),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	deleteDeposit(salesAgreementId: number, depositId: number): Observable<number>
	{
		const entity = `salesAgreements(${salesAgreementId})/deposits(${depositId})`;
		const endpoint = environment.apiUrl + entity;

		return this._http.delete(endpoint).pipe(
			map(response => depositId),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveNote(note: Note): Observable<Note>
	{
		// Don't create note if the note content is empty
		if (!note.noteContent)
		{
			return of(<Note>({}));
		}

		let omit: Array<string> = ["targetAudiences", note.id && note.id === 0 ? "id" : ""];
		const newNote = _.omit(note, omit);

		const entity = `notes` + (newNote.id ? `(${newNote.id})` : '');
		const endpoint = environment.apiUrl + entity;
		const method = newNote.id ? 'patch' : 'post';

		return withSpinner(this._http)[method](endpoint, { ...newNote, noteType: note.noteType }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((dto: Note) => new Note(dto)),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	deleteNote(noteId: number, agreementId: number): Observable<number>
	{
		const entity = `notes(${noteId})`;
		const endpoint = environment.apiUrl + entity;

		return this._http.delete(endpoint).pipe(
			map(response => noteId),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveDeposit(deposit: SalesAgreementDeposit, processElectronically: boolean): Observable<SalesAgreementDeposit>
	{
		if (deposit.id && deposit.id === 0)
		{
			deposit = removeProperty(deposit, 'id');
		}

		const entity = `salesAgreements(${deposit.salesAgreementId})/deposits` + (deposit.id ? `(${deposit.id})` : '');
		const endpoint = environment.apiUrl + entity + `?processElectronically=${processElectronically ? 'true' : 'false'}`;
		const method = deposit.id ? 'patch' : 'post';

		return this._http[method](endpoint, deposit, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((dto: SalesAgreementDeposit) => new SalesAgreementDeposit(dto)),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	getDeposit(salesAgreementId: number, depositId: number): Observable<SalesAgreementDeposit>
	{
		const entity = `salesAgreements(${salesAgreementId})/deposits(${depositId})`;

		return this._http.get<any>(environment.apiUrl + entity).pipe(
			map((dto: SalesAgreementDeposit) => new SalesAgreementDeposit(dto)),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	depositHasInvoice(deposit: SalesAgreementDeposit): Observable<boolean>
	{
		const entity = `GetDepositInvoice(SalesAgreementID=${deposit.salesAgreementId},DepositID=${deposit.id})`;

		return this._http.get<any>(environment.apiUrl + entity).pipe(
			map(() => true),
			catchError(err =>
			{
				if (err.status === 404)
				{
					return of(false);
				}
				else
				{
					return _throw(err);
				}
			})
		);
	}

	deleteContingency(salesAgreementId: number, contingencyId: number): Observable<number>
	{
		const entity = `salesAgreements(${salesAgreementId})/contingencies(${contingencyId})`;
		const endpoint = environment.apiUrl + entity;

		return this._http.delete(endpoint).pipe(
			map(response => contingencyId),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveContingency(contingency: SalesAgreementContingency): Observable<SalesAgreementContingency>
	{
		if (contingency.id && contingency.id === 0)
		{
			contingency = removeProperty(contingency, 'id');
		}

		const entity = `salesAgreements(${contingency.salesAgreementId})/contingencies` + (contingency.id ? `(${contingency.id})` : '');
		const endpoint = environment.apiUrl + entity;
		const method = contingency.id ? 'patch' : 'post';

		return this._http[method](endpoint, contingency, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((dto: SalesAgreementContingency) => new SalesAgreementContingency(dto)),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	voidSalesAgreement(salesAgreementId: number, reasonKey: string, envelopeId?: string): Observable<SalesAgreement>
	{
		const entity = `voidSalesAgreement`;
		const endpoint = environment.apiUrl + entity;

		return this._http.patch(endpoint, { id: salesAgreementId, reasonKey: reasonKey, envelopeId: envelopeId }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((results: ISalesAgreement) => new SalesAgreement(results)),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	cancelSalesAgreement(salesAgreementId: number, buildType: string, noteContent: string, reasonKey: string): Observable<SalesAgreement>
	{
		const entity = `cancelSalesAgreement`;
		const endpoint = `${environment.apiUrl}${entity}`;

		const data = {
			id: salesAgreementId,
			buildType: buildType,
			reasonKey: reasonKey,
			noteContent: noteContent
		}

		return this._http.post(endpoint, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((results: ISalesAgreement) => new SalesAgreement(results)),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	createSalesAgreementCancellation(salesAgreementId: number, noteId: number, reasonKey: string): Observable<SalesAgreementCancelVoidInfo>
	{
		const entity = `salesAgreements(${salesAgreementId})/cancellations`;
		const endpoint = environment.apiUrl + entity;

		const data: ISalesAgreementCancelVoidInfo = {
			salesAgreementId: salesAgreementId,
			cancelReasonDesc: reasonKey,
			voidReasonDesc: null,
			noteId: noteId
		};

		return withSpinner(this._http).post(endpoint, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((dto: ISalesAgreementCancelVoidInfo) =>
			{
				let cancelInfo = new SalesAgreementCancelVoidInfo(dto);

				return cancelInfo;
			}),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	setSalesAgreementStatus(salesAgreementId: number, status: string): Observable<SalesAgreement>
	{
		const action = `setSalesAgreementStatus`;
		const endpoint = environment.apiUrl + action;

		return withSpinner(this._http).patch(endpoint, { id: salesAgreementId, status: status }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((results: ISalesAgreement) => new SalesAgreement(results)),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	signSalesAgreement(salesAgreementId: number, signedDate: Date): Observable<SalesAgreement>
	{
		const action = `signSalesAgreement`;
		const endpoint = environment.apiUrl + action;

		return withSpinner(this._http).patch(endpoint, { id: salesAgreementId, signedDate: signedDate }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((results: ISalesAgreement) => new SalesAgreement(results)),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	saveSalesAgreementSalesConsultants(salesAgreementId: number, consultants: Consultant[]): Observable<Array<Consultant>>
	{
		const entity = `saveSalesAgreementSalesConsultants`;
		const endpoint = environment.apiUrl + entity;

		const data = {
			id: salesAgreementId,
			consultants: consultants.map(c =>
			{
				return {
					id: c.id,
					contactId: c.contact.id,
					commission: c.commission,
					isPrimary: c.isPrimary
				} as ISalesAgreementSalesConsultantDto;
			})
		};

		return withSpinner(this._http).post(endpoint, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((results: any) =>
			{
				let consultants = results.value.map(c => new Consultant(c));

				return consultants;
			}),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	approveSalesAgreement(salesAgreementId: number, isAutoApproval): Observable<SalesAgreement>
	{
		const action = `approveSalesAgreement`;
		const endpoint = environment.apiUrl + action;
		const data = {
			id: salesAgreementId,
			isAutoApproval: isAutoApproval
		};

		return withSpinner(this._http).patch(endpoint, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((results: ISalesAgreement) => new SalesAgreement(results)),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	private mapOptions(choice: Choice, elevationDP: DecisionPoint, isDPElevation: boolean, isColorScheme: boolean, tree: Tree, optionRules: OptionRule[]): Array<any>
	{
		let optionsDto: Array<any> = [];

		if (choice.options.length)
		{
			optionsDto = choice.options.map(o =>
			{
				const selectedAttributes = choice.selectedAttributes.filter(att => !att.locationGroupId && o.attributeGroups.some(g => g === att.attributeGroupId))
											.map(att =>
											{
												return {
													attributeCommunityId: att.attributeId,
													attributeGroupCommunityId: att.attributeGroupId,
													action: 'Add'
												};
											});

				const treeChoices = tree ? _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))) : [];
				const reassignedAttributes = this.mapReassignedAttributes(o, choice, treeChoices);

				return {
					planOptionId: o.id,
					price: o.listPrice,
					quantity: choice.quantity,
					optionSalesName: o.name,
					optionDescription: o.description,
					jobOptionTypeName: getJobOptionType(o, elevationDP, isDPElevation, isColorScheme, tree, optionRules),
					attributes: [...selectedAttributes, ...reassignedAttributes],
					locations: choice.selectedAttributes.filter(att => att.locationGroupId && o.locationGroups.some(g => g === att.locationGroupId))
						.reduce((prev, curr) =>
						{
							let existing = prev.find(l => l.locationCommunityId === curr.locationId);

							if (existing)
							{
								existing.attributes.push({
									attributeCommunityId: curr.attributeId,
									attributeGroupCommunityId: curr.attributeGroupId,
									action: 'Add'
								});
							}
							else
							{
								prev.push({
									locationCommunityId: curr.locationId,
									locationGroupCommunityId: curr.locationGroupId,
									quantity: curr.locationQuantity,
									action: 'Add',
									attributes: curr.attributeId ? [{
										attributeCommunityId: curr.attributeId,
										attributeGroupCommunityId: curr.attributeGroupId,
										action: 'Add'
									}] : []
								});
							}

							return prev;
						}, [])
				};
			});
		}

		return optionsDto;
	}

	private mapLocations(choice: SelectedChoice | Choice): Array<any>
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
							locationDto.attributes.push({
								attributeCommunityId: a.attributeId,
								attributeGroupCommunityId: a.attributeGroupId,
								action: 'Add'
							});
						}
					}
					else
					{
						locationsDto.push({
							locationCommunityId: a.locationId,
							locationGroupCommunityId: a.locationGroupId,
							quantity: a.locationQuantity,
							action: 'Add',
							attributes: a.attributeId ? [{
								attributeCommunityId: a.attributeId,
								attributeGroupCommunityId: a.attributeGroupId,
								action: 'Add'
							}] : []
						});
					}
				}
			});
		}

		return locationsDto;
	}

	private mapAttributes(choice: SelectedChoice | Choice): Array<any>
	{
		const attributesDto: Array<any> = [];

		if (choice.selectedAttributes)
		{
			choice.selectedAttributes.forEach(a =>
			{
				if (!a.locationGroupId)
				{
					attributesDto.push({
						attributeCommunityId: a.attributeId,
						attributeGroupCommunityId: a.attributeGroupId,
						action: 'Add'
					});
				}
			});
		}

		return attributesDto;
	}

	mapReassignedAttributes(option: PlanOption, fromChoice: Choice, treeChoices: Choice[])
	{
		const reassignedAttributesDto: Array<any> = [];

		if (fromChoice)
		{
			option.attributeGroups?.forEach(attributeGroup => {
				// Find the choice that an attribute is reassigned to
				const choicesWithReassignments = treeChoices.find(c => c.mappedAttributeGroups?.find(mappedGroup => mappedGroup.attributeReassignmentFromChoiceId === fromChoice.id && mappedGroup.id === attributeGroup));
				
				// Find the selected attributes in the choice with reassignments
				const selectedAttribute = choicesWithReassignments?.selectedAttributes?.find(sa => sa.attributeGroupId === attributeGroup);
				if (selectedAttribute && !selectedAttribute.locationGroupId)
				{
					reassignedAttributesDto.push({
						attributeCommunityId: selectedAttribute.attributeId,
						attributeGroupCommunityId: selectedAttribute.attributeGroupId,
						action: 'Add'
					});
				}
			});
		}

		return reassignedAttributesDto;
	}	

	createJIOForSpec(
		tree: Tree, 
		scenario: Scenario, 
		communityId: number, 
		buildMode: string, 
		baseHouseOption: PlanOption, 
		optionRules: OptionRule[], 
		pendingJobSummary: IPendingJobSummary
	): Observable<Job>
	{
		const action = `CreateJIOForSpec`;
		const url = `${environment.apiUrl}${action}`;
		const elevationDP = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).find(dp => dp.dPointTypeId === 1);
		const colorSchemeDP = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).find(dp => dp.dPointTypeId === 2);

		const choices = _.flatMap(
			tree.treeVersion.groups,
			g => _.flatMap(
				g.subGroups,
				sg => _.flatMap(
					sg.points,
					pt => pt.choices.filter(c => c.quantity > 0).map(c => { return { choice: c, pointLabel: pt.label, subgroupLabel: sg.label, groupLabel: g.label }; })
				)
			)
		);

		const lotInfo = {
			communityId: communityId,
			lotId: scenario.lotId,
			planId: scenario.planId,
			handing: scenario.handing ? scenario.handing.handing : null,
			buildMode: buildMode
		}

		const data = {
			lotInfo,
			choices: choices.map(c =>
			{
				const isColorScheme = colorSchemeDP ? c.choice.treePointId === colorSchemeDP.id : false;
				const isDPElevation = elevationDP ? c.choice.treePointId === elevationDP.id : false;
				const options = this.mapOptions(c.choice, elevationDP, isDPElevation, isColorScheme, tree, optionRules);

				// look for any options marked as Elevation so the choice can be flagged and grouped with elevation CO.
				const hasElevationOption = options.length && options.findIndex(x => x.jobOptionTypeName === 'Elevation') > -1;
				const isElevation = hasElevationOption || isDPElevation;				

				return {
					dpChoiceId: c.choice.id,
					dpChoiceQuantity: c.choice.quantity,
					dpChoiceCalculatedPrice: c.choice.price,
					choiceLabel: c.choice.label,
					pointLabel: c.pointLabel,
					subgroupLabel: c.subgroupLabel,
					groupLabel: c.groupLabel,
					options: options,
					attributes: this.mapAttributes(c.choice),
					locations: this.mapLocations(c.choice),
					isElevation: isElevation,
					isColorScheme: isColorScheme,
					action: 'Add'
				};
			}),
			baseHouseOption: {
				planOptionId: baseHouseOption.id,
				price: baseHouseOption.listPrice,
				quantity: 1,
				optionSalesName: baseHouseOption.name,
				optionDescription: baseHouseOption.description
			},
			pendingJobSummary: pendingJobSummary
		};

		return (withSpinner(this._http)).post(url, data).pipe(
			map((results: IJob) => new Job(results)),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}
}
