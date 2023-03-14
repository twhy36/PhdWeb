import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { withSpinner, defaultOnNotFound, SalesAgreement, ISalesAgreementInfo, SalesAgreementInfo } from 'phd-common';

import { environment } from '../../../../environments/environment';
import { ODataResponse } from '../../shared/models/odata-response.model';

@Injectable()
export class SalesAgreementService
{
	private _ds: string = encodeURIComponent('$');

	constructor(private _http: HttpClient) { }

	getSalesAgreement(salesAgreementId?: number): Observable<SalesAgreement>
	{
		if (!salesAgreementId)
		{
			//use access token to get sales agreement
			const url = `${environment.apiUrl}GetUserSalesAgreement?${this._ds}select=id,status`;

			return withSpinner(this._http).get<ODataResponse<SalesAgreement[]>>(url).pipe(
				map(dto => new SalesAgreement(dto.value[0])),
				catchError(error =>
				{
					console.error(error);

					return _throw(error);
				})
			);
		}
		else
		{
			const entity = `salesAgreements(${salesAgreementId})`;
			const expandBuyers = 'buyers($expand=opportunityContactAssoc($expand=contact($select=id,lastName)))';
			const expandPrograms = 'programs($select=id,salesAgreementId,salesProgramId,salesProgramDescription,amount;$expand=salesProgram($select=id, salesProgramType, name))';
			const expandJobAssocs = 'jobSalesAgreementAssocs($select=jobId;$orderby=createdUtcDate desc;$top=1)';
			const expandPriceAdjustments = 'salesAgreementPriceAdjustmentAssocs($select=id,salesAgreementId,priceAdjustmentType,amount)';
			const expand = `${expandBuyers},${expandPrograms},${expandJobAssocs},${expandPriceAdjustments}`;

			const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}`;
			const url = `${environment.apiUrl}${entity}?${qryStr}`;

			return withSpinner(this._http).get(url).pipe(
				map(dto => new SalesAgreement(dto)),
				catchError(error =>
				{
					console.error(error);

					return _throw(error);
				})
			);
		}
	}

	getSalesAgreementInfo(salesAgreementId: number): Observable<SalesAgreementInfo>
	{
		const entity = `salesAgreementInfos(${salesAgreementId})`;
		const endpoint = environment.apiUrl + entity;

		return withSpinner(this._http).get<ISalesAgreementInfo>(endpoint).pipe(
			map(dto => new SalesAgreementInfo(dto)),
			defaultOnNotFound('getSalesAgreementInfo', new SalesAgreementInfo())
		);
	}
}
