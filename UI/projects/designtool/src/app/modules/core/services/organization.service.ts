import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

import { SalesCommunity } from 'phd-common';

@Injectable()
export class OrganizationService
{
	private _ds: string = encodeURIComponent('$');

	constructor(private _http: HttpClient)
	{

	}

	/**
	 * Gets the EDH sales community id based on the CRM sales community id (guid)
	 * @param salesCommunityGuid
	 */
	getSalesCommunityId(salesCommunityGuid: string): Observable<number>
	{
		const filter = `number eq ${salesCommunityGuid}`;
		const url = `${environment.apiUrl}salesCommunities?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=id,number`;
		return this._http.get<any>(url).pipe(
			map(response => response.value[0].id),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getSalesCommunity(id: number): Observable<SalesCommunity>
	{
		const entity = `salesCommunities(${id})`;
		const expand = `financialCommunities($select=id,name,number,city,state,zip,isDesignPreviewEnabled,isColorSchemePlanRuleEnabled),market($select=id,number)`
	
		const select = `id, number, name`;

		let qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<SalesCommunity>(url).pipe(
			catchError(error => {
				console.error(error);

				return _throw(error);
			})
		);
	}

	getSalesCommunityByFinancialCommunityId(id: number, includeFinancialCommunities: boolean = false): Observable<SalesCommunity>
	{
		const entity = `salesCommunities`;
		const expandFilter = `; $filter=id eq ${id}`;
		const expand = `financialCommunities($select=id,name,number,city,state,zip,isDesignPreviewEnabled,isColorSchemePlanRuleEnabled${includeFinancialCommunities ? '' : expandFilter}),market($select=id,number)`;
		const filter = `financialCommunities/any(fc: fc/id eq ${id})`;
		const select = `id, number, name`;
		let qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				var value = response.value[0];

				let comm = { id: value.id, name: value.name, number: value.number, market: value.market } as SalesCommunity;
				if (includeFinancialCommunities) {
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
}
