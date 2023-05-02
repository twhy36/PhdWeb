import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { FinancialCommunity, SalesCommunity, withSpinner, ODataResponse } from 'phd-common';

import { environment } from '../../../../environments/environment';

@Injectable()
export class OrganizationService
{
	private _ds: string = encodeURIComponent('$');

	constructor(private _http: HttpClient) { }

	getSalesCommunityByFinancialCommunityId(id: number, includeFinancialCommunities: boolean = false): Observable<SalesCommunity>
	{
		const entity = 'salesCommunities';
		const expandFilter = `; $filter=id eq ${id}`;
		const expand = `financialCommunities($select=id,name,number,city,state,zip,financialBrandId${includeFinancialCommunities ? '' : expandFilter}),market($select=id,number,name)`;
		const filter = `financialCommunities/any(fc: fc/id eq ${id})`;
		const select = 'id, number, name';

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<ODataResponse<SalesCommunity[]>>(url).pipe(
			map(response =>
			{
				var value = response.value[0];

				const comm = { id: value.id, name: value.name, number: value.number, market: value.market } as SalesCommunity;
				if (includeFinancialCommunities) 
				{
					comm.financialCommunities = value.financialCommunities;
				}
				return comm;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getFinancialCommunityByFinancialCommunityNumber(number: number): Observable<FinancialCommunity>
	{
		const entity = 'financialCommunities';
		const filter = `number eq '${number}'`;
		const select = 'id, number, name';

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<ODataResponse<FinancialCommunity[]>>(url).pipe(
			map(response =>
			{
				var value = response.value[0];

				const comm = { id: value.id, name: value.name, number: value.number } as FinancialCommunity;
				return comm;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}
}
