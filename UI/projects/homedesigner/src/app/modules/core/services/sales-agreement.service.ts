import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { withSpinner, SalesAgreement } from 'phd-common';

import { environment } from '../../../../environments/environment';

@Injectable()
export class SalesAgreementService
{
	private _ds: string = encodeURIComponent("$");

	constructor(private _http: HttpClient) { }

	getSalesAgreement(salesAgreementId: number): Observable<SalesAgreement>
	{
		const entity = `salesAgreements(${salesAgreementId})`;
		const expandPrograms = `programs($select=id,salesAgreementId,salesProgramId,salesProgramDescription,amount;$expand=salesProgram($select=id, salesProgramType, name))`;
		const expandJobAssocs = `jobSalesAgreementAssocs($select=jobId;$orderby=createdUtcDate desc;$top=1)`;
		const expandPriceAdjustments = `salesAgreementPriceAdjustmentAssocs($select=id,salesAgreementId,priceAdjustmentType,amount)`;
		const expand = `${expandPrograms},${expandJobAssocs},${expandPriceAdjustments}`;

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
