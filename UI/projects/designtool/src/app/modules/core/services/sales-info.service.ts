import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw ,  of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { SalesProgram } from '../../shared/models/sales-program.model';
import { IdentityService } from 'phd-common/services';

@Injectable()
export class SalesInfoService
{
	_ds: string = encodeURIComponent("$");
	today = new Date().toISOString();
	programs = {};

	constructor(private _identityService: IdentityService, private _http: HttpClient) { }

	getSalesPrograms(communityId): Observable<Array<SalesProgram>>
	{
		if (this.programs[communityId])
		{
			return of(this.programs[communityId]);
		}
		else
		{
			this.programs[communityId] = new Array<SalesProgram>();
		}

		const filter = `financialCommunityId eq ${communityId} and startDate le ${this.today} and endDate ge ${this.today}`;
		const orderby = 'name';
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${orderby}`;
		const url = `${environment.apiUrl}salesPrograms?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				return response.value.map(program =>
				{
					const p = new SalesProgram(program);

					this.programs[communityId].push(p);

					return p;
				});
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getFinancialCommunityId(salesAgreementId): Observable<number> {
		//assumption: sales agreement can only be tied to change orders in a single financial community. is this accurate?
		//if not, we'll have to look at the most recent and filter by status
		var expand = "job($select=financialCommunityId)";
		var filter = `jobChangeOrderGroupSalesAgreementAssocs/any(c: c/salesAgreementId eq ${salesAgreementId}) and salesStatusDescription ne 'Withdrawn'`;
		var qry = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=job&${this._ds}top=1&${this._ds}orderby=${encodeURIComponent('createdUtcDate desc')}`

		const url = `${environment.apiUrl}changeOrderGroups?${qry}`;

		return this._http.get<any>(url).pipe(
			map(response => response.value && response.value.length && response.value[0].job && response.value[0].job.financialCommunityId || null),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}
}
