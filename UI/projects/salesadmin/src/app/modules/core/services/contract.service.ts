import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import * as odataUtils from '../../shared/utils/odata.util';

import { Settings } from "../../shared/models/settings.model";
import { ContractTemplate } from '../../shared/models/contracts.model';
import { MergeField, CommunityMergeField } from '../../shared/models/mergeField.model';
import { ESignField } from '../../shared/models/eSignFields.model';
import { SettingsService } from "./settings.service";

import * as _ from 'lodash';
import * as moment from 'moment';
import { withSpinner } from 'phd-common';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class ContractService
{
	private settings: Settings;
	private _batch = "$batch";

	constructor(
		private _http: HttpClient,
		private _settingsService: SettingsService
	)
	{
		this.settings = _settingsService.getSettings();
	}

	getDraftOrInUseContractTemplates(marketId: number): Observable<Array<ContractTemplate>>
	{
		let url = this.settings.apiUrl;
		const filter = `org/edhMarketId eq ${marketId} and (status eq 'Draft' or status eq 'In Use')`;
		const expand = `org($select=edhMarketId),templateFinancialCommunityAssocs($select=org;$expand=org($select=orgID,edhFinancialCommunityId))`;
		const orderby = `documentName`;

		const qryStr = `${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}orderby=${encodeURIComponent(orderby)}`;

		url += `contractTemplates?${qryStr}`;

		return withSpinner(this._http).get(url).pipe(
			map(response =>
			{

				let contract = response['value'] as Array<ContractTemplate>;
				let contractTemplates = this.mapTemplates(contract);

				return contractTemplates;
			}),
			catchError(this.handleError)
		);
	}

	getTemplateUrl(templateId: number): Observable<string>
	{
		let url = this.settings.apiUrl + `GetTemplateSasUrl(TemplateId=${templateId})`;

		return this._http.get(url).pipe(
			map(response =>
			{
				return response['value'];
			}),
			catchError(this.handleError)
		);
	}

	getCommunitiesWithExistingTemplate(marketId: number, templateTypeId: number, isPhd?: boolean, isTho?: boolean): Observable<Array<number>>
	{
		/* isPhd	isTho	Condition
		 *	0			0
		 * 	0			1			and isTho eq true
		 * 	1			0			and isPhd eq true
		 * 	1			1			and (isPhd eq true or isTho eq true)
		 */
		let isPhdThoCondition = '';
		if (isPhd && isTho) {
			isPhdThoCondition = " and (isPhd eq true or isTho eq true)";
		} else if (isPhd || isTho) {
			isPhdThoCondition = ` and ${ isPhd ? 'isPhd' : 'isTho' } eq true`;
		}

		let url = this.settings.apiUrl;
		const filter = `org/edhMarketId eq ${marketId} and templateTypeId eq ${templateTypeId} and status ne 'Inactive'${isPhdThoCondition}`;
		const expand = 'org,templateFinancialCommunityAssocs($expand=org($select=edhFinancialCommunityId)),org($select=edhMarketId)';
		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}`;

		url += `contractTemplates?${qryStr}`;


		// get all SalesAgreements active for market
		// for those, get communityIds associated

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				let communityIds: number[] = _.uniq(_.flatten(response['value'].filter(ct => !!ct.templateFinancialCommunityAssocs.length)
					.map(t => t.templateFinancialCommunityAssocs.map(t => t.org.edhFinancialCommunityId))));

				return communityIds;
			}),
			catchError(this.handleError)
		);
	}

	/**
	 * Create/Edit Contract Document
	 * @param documentDto
	 */
	saveDocument(documentDto: ContractTemplate): Observable<ContractTemplate>
	{
		let url = this.settings.apiUrl;

		if (documentDto.templateId)
		{
			url += `contractTemplates(${documentDto.templateId})`;

			return this._http.patch(url, documentDto).pipe(
				map((response: ContractTemplate) =>
				{
					return response;
				}),
				catchError(this.handleError));
		}
		else
		{
			url += `contractTemplates`;

			return this._http.post(url, documentDto).pipe(
				map((response: ContractTemplate) =>
				{
					return response;
				}),
				catchError(this.handleError));
		}
	}

	deleteTemplate(dto: ContractTemplate)
	{
		let url = settings.apiUrl + `contractTemplates(${dto.templateId})`;

		return this._http.delete(url).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError)
		)
	}

	updateAddendumOrder(dtos: Array<ContractTemplate>): Observable<Array<ContractTemplate>>
	{
		const templatesToBeUpdated: ContractTemplate[] = [];

		dtos.forEach(t =>
		{
			templatesToBeUpdated.push({
				templateId: t.templateId,
				displayOrder: t.displayOrder
			} as ContractTemplate);
		});

		const endPoint = `${settings.apiUrl}${this._batch}`;
		const batchRequests = odataUtils.createBatchPatch<ContractTemplate>(templatesToBeUpdated, 'templateId', 'contractTemplates', 'displayOrder');
		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return odataUtils.parseBatchResults<ContractTemplate>(results);
			})
		);
	}

	getMergeFields(marketId: number): Observable<Array<MergeField>>
	{
		const filter = `org/edhMarketId eq ${marketId} and org/edhFinancialCommunityId eq null`;
		const expand = `org`;
		const select = `customFieldMarketId, marketId, fieldName, fieldValue, isActive`;
		const orderBy = `fieldName`;

		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}&${encodeURIComponent("$")}orderby=${encodeURIComponent(orderBy)}`;

		let url = this.settings.apiUrl;
		url += `mergeFields?${qryStr}`

		return withSpinner(this._http).get(url).pipe(
			map(response =>
			{
				let mergeFields = response['value'] as Array<MergeField>;

				return mergeFields;
			}),
			catchError(this.handleError)
		);
	}

	getAllMergeFields(marketId: number, communityId: number): Observable<Array<MergeField>>
	{
		const filter = `org/edhMarketId eq ${marketId} and isActive eq true`;
		const expand = `customFieldFinancialCommunities($filter=org/edhFinancialCommunityId eq ${communityId})`;
		const select = `customFieldMarketId, marketId, fieldName, fieldValue, isActive`;
		const orderBy = `fieldName`;

		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}&${encodeURIComponent("$")}orderby=${encodeURIComponent(orderBy)}`;

		let url = this.settings.apiUrl;
		url += `mergeFields?${qryStr}`

		return withSpinner(this._http).get(url).pipe(
			map(response =>
			{
				let mergeFields = response['value'] as Array<MergeField>;

				return mergeFields;
			}),
			catchError(this.handleError)
		);
	}

	getCurrentCommunityMergeField(communityId: number, mergeFieldMarketId: number): Observable<Array<CommunityMergeField>>
	{
		const filter = `org/edhFinancialCommunityId eq ${communityId} and customFieldMarketId eq ${mergeFieldMarketId}`;
		const select = `customFieldFinancialCommunityId, customFieldMarketId, financialCommunityId, fieldValue, isActive`;
		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;

		let url = this.settings.apiUrl;
		url += `communityMergeFields?${qryStr}`

		return this._http.get(url).pipe(
			map(response =>
			{
				let communityMergeFields = response['value'] as Array<CommunityMergeField>;

				return communityMergeFields;
			}),
			catchError(this.handleError)
		);
	}

	saveCommunityMergeField(dto: CommunityMergeField): Observable<CommunityMergeField>
	{
		let url;

		url = this.settings.apiUrl + `communityMergeFields`;

		return this._http.post(url, dto, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((response: CommunityMergeField) =>
			{
				return response;
			}),
			catchError(this.handleError)
		);
	}

	saveMergeField(dto: MergeField): Observable<MergeField>
	{
		let url;

		if (dto.customFieldMarketId)
		{
			url = this.settings.apiUrl + `mergeFields(${dto.customFieldMarketId})`;

			return this._http.patch(url, dto, { headers: { 'Prefer': 'return=representation' } }).pipe(
				map((response: MergeField) =>
				{
					return response;
				}),
				catchError(this.handleError)
			);
		}
		else
		{
			url = this.settings.apiUrl + `mergeFields`;

			return this._http.post(url, dto, { headers: { 'Prefer': 'return=representation' } }).pipe(
				map((response: MergeField) =>
				{
					return response;
				}),
				catchError(this.handleError)
			);
		}
	}

	updateCommunityMergeFields(dtos: Array<CommunityMergeField>): Observable<Array<CommunityMergeField>>
	{
		const communityFieldsToBeUpdated = dtos.map(t =>
		{
			return {
				customFieldFinancialCommunityId: t.customFieldFinancialCommunityId,
				fieldValue: t.fieldValue,
				isActive: t.isActive
			} as CommunityMergeField;
		});

		const endPoint = `${settings.apiUrl}${this._batch}`;
		const batchRequests = odataUtils.createBatchPatch<CommunityMergeField>(communityFieldsToBeUpdated, 'customFieldFinancialCommunityId', 'communityMergeFields', 'fieldValue', 'isActive');
		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return odataUtils.parseBatchResults<CommunityMergeField>(results);
			})
		);
	}

	deleteMergeField(dto: MergeField)
	{
		let url = settings.apiUrl + `mergeFields(${dto.customFieldMarketId})`;

		return this._http.delete(url).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError)
		);
	}

	deleteCommunityMergeField(dtos: Array<CommunityMergeField>)
	{
		const communityFieldsToBeUpdated = dtos.map(t =>
		{
			return {
				customFieldFinancialCommunityId: t.customFieldFinancialCommunityId
			} as CommunityMergeField;
		});

		const endPoint = `${settings.apiUrl}${this._batch}`;
		const batchRequests = odataUtils.createBatchDelete<CommunityMergeField>(communityFieldsToBeUpdated, 'customFieldFinancialCommunityId', 'communityMergeFields');
		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return odataUtils.parseBatchResults<CommunityMergeField>(results);
			})
		);
	}

	getSignField(financialCommunityId: number): Observable<ESignField>
	{
		let url = this.settings.apiUrl + `eSignFields(${financialCommunityId})`;

		return withSpinner(this._http).get(url).pipe(
			map((response: ESignField) =>
			{
				return response;
			}),
			catchError(this.handleError)
		);
	}

	saveESignField(signFieldDto: ESignField): Observable<ESignField>
	{
		let url = this.settings.apiUrl + `eSignFields`;

		return this._http.post(url, signFieldDto).pipe(
			map((response: ESignField) =>
			{
				return response;
			}),
			catchError(this.handleError)
		);
	}

	updateESignField(signFieldDto: ESignField): Observable<ESignField>
	{
		let url = this.settings.apiUrl + `eSignFields(${signFieldDto.financialCommunityId})`;

		return this._http.patch(url, signFieldDto, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((response: ESignField) =>
			{
				return response;
			}),
			catchError(this.handleError)
		);
	}

	/**
	 * Maps optionMarket results
	 * @param ContractTemplates
	 */
	mapTemplates(contractTemplates: Array<ContractTemplate>)
	{
		let templates = contractTemplates.map(t =>
		{
			t.effectiveDate = new Date(moment.utc(t.effectiveDate).format('L')).toJSON();
			t.expirationDate = new Date(moment.utc(t.expirationDate).format('L')).toJSON();

			return {
				templateId: t.templateId,
				parentTemplateId: t.parentTemplateId,
				isPhd: t.isPhd,
				isTho: t.isTho,
				documentName: t.documentName,
				displayOrder: t.displayOrder,
				displayName: t.displayName,
				version: t.version,
				marketId: t.marketId,
				templateTypeId: t.templateTypeId,
				addendumTypeId: t.addendumTypeId,
				effectiveDate: t.effectiveDate,
				expirationDate: t.expirationDate,
				status: t.status,
				assignedCommunityIds: t.templateFinancialCommunityAssocs.map(t => t.org.edhFinancialCommunityId),
			} as ContractTemplate;
		});

		return templates;
	}

	private handleError(error: Response)
	{
		return throwError(error || 'Server error');
	}
}
