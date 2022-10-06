import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as odataUtils from '../../shared/utils/odata.util';
import { Settings } from '../../shared/models/settings.model';
import { SettingsService } from "./settings.service";
import { ChangeOrderTypeAutoApproval } from '../../shared/models/changeOrderTypeAutoApproval.model';
import { withSpinner } from 'phd-common';
import { FinancialCommunity } from '../../shared/models/financialCommunity.model';
import { CommunityPdf, SectionHeader } from '../../shared/models/communityPdf.model';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class CommunityService
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

	getChangeOrderTypeAutoApprovals(communityId: number): Observable<Array<ChangeOrderTypeAutoApproval>>
	{
		let url = settings.apiUrl;
		url += `changeOrderTypeAutoApprovals`;

		const body = {
			'financialCommunityId': communityId
		};

		return withSpinner(this._http).post(url, body).pipe(
			map((response: any) =>
			{
				let returnVal = response.value.map(data =>
				{
					return {
						financialCommunityId: data.financialCommunityId,
						edhChangeOrderTypeId: data.edhChangeOrderTypeId,
						isAutoApproval: data.isAutoApproval
					} as ChangeOrderTypeAutoApproval
				});

				return returnVal as Array<ChangeOrderTypeAutoApproval>;
			}))
	}

	patchChangeOrderTypeAutoApprovals(autoApproval: Array<ChangeOrderTypeAutoApproval>)
	{
		const endPoint = `${settings.apiUrl}${this._batch}`;
		const batchRequests = odataUtils.createBatchPatch<ChangeOrderTypeAutoApproval>(autoApproval, null, 'changeOrderTypeAutoApproval', 'financialCommunityId', 'edhChangeOrderTypeId', 'isAutoApproval');

		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return withSpinner(this._http).post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return odataUtils.parseBatchResults<ChangeOrderTypeAutoApproval>(results);
			})
		);
	}

	patchFinancialCommunity(financialCommunityId: number, updatedFields: {}): Observable<FinancialCommunity>
	{
		let dto = {
			id: financialCommunityId,
			...updatedFields
		};

		let url = settings.apiUrl;

		url += `financialCommunities(${financialCommunityId})`;

		return this._http.patch<FinancialCommunity>(url, dto).pipe(
			map((response: FinancialCommunity) =>
			{
				return response;
			})
		);
	}

	deleteCommunityPdf(pdf: CommunityPdf): Observable<boolean>
	{
		let url = settings.apiUrl;
		const entity = `financialCommunityId(${pdf.financialCommunityId})/fileName(${pdf.fileName})`;
		const endpoint = url + entity;
		return this._http.delete<any>(endpoint).pipe(
			map(response => response.value as boolean),
			catchError(this.handleError)
		);
	}

	getCommunityPdfsByFinancialCommunityId(financialCommunityId: number): Observable<Array<CommunityPdf>>
	{
		let url = settings.apiUrl;
		url += `GetCommunityPdfs(financialCommunityId=${financialCommunityId})`
		return withSpinner(this._http).get<any>(url).pipe(
			map(response =>
			{
				let returnVal = response.value.map(data =>
				{
					return {
						marketId: data.marketId,
						financialCommunityId: data.financialCommunityId,
						sortOrder: data.sortOrder,
						linkText: data.linkText,
						description: data.description,
						effectiveDate: data.effectiveDate,
						expirationDate: data.expirationDate,
						fileName: data.fileName,
						sectionHeader: SectionHeader[data.sectionHeader as string]
					} as CommunityPdf
				});
				return returnVal as Array<CommunityPdf>;
			})
		);
	}

	getCommunityPdfUrl(financialCommunityId: number, fileName: string): Observable<string>
	{
		let url = settings.apiUrl;
		fileName = fileName.replace(/'/g, "''");
		url += `GetCommunityPdfSasUrl(financialCommunityId=${financialCommunityId},fileName='${fileName}')`
		return this._http.get<any>(url).pipe(
			map(response => response.value as string)
		);
	}

	saveCommunityPdf(formData: FormData): Observable<CommunityPdf>
	{
		let url = settings.apiUrl;
		url += 'AddCommunityPdf';
		return this._http.post<any>(url, formData).pipe(
			map(response =>
			{
				return {
					marketId: response.marketId,
					financialCommunityId: response.financialCommunityId,
					sortOrder: response.sortOrder,
					linkText: response.linkText,
					description: response.description,
					effectiveDate: response.effectiveDate,
					expirationDate: response.expirationDate,
					fileName: response.fileName,
					sectionHeader: SectionHeader[response.sectionHeader as string]
				}
			}
			)
		);
	}

	updateCommunityPdfs(pdfList: Array<CommunityPdf>): Observable<Array<CommunityPdf>>
	{
		// Put SectionHeader in format that OData likes
		const pdfs = Array<any>();
		pdfList.forEach(pdf =>
		{
			const newPdf: any = pdf as CommunityPdf;
			newPdf.sectionHeader = pdf.sectionHeader.toString();
			delete newPdf.__index;
			pdfs.push(newPdf);
		});

		let url = settings.apiUrl;
		url += 'UpdateCommunityPdfs';
		const body = {
			communityPdfs: pdfs
		}
		return this._http.patch<any>(url, body).pipe(
			map(response =>
			{
				let returnVal = response.value.map(data =>
				{
					return {
						marketId: data.marketId,
						financialCommunityId: data.financialCommunityId,
						sortOrder: data.sortOrder,
						linkText: data.linkText,
						description: data.description,
						effectiveDate: data.effectiveDate,
						expirationDate: data.expirationDate,
						fileName: data.fileName,
						sectionHeader: SectionHeader[data.sectionHeader as string]
					} as CommunityPdf
				});
				return returnVal as Array<CommunityPdf>
			})
		);
	}

	private handleError(error: Response)
	{
		return throwError(error || 'Server error');
	}
}
