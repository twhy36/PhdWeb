import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { FinancialBrand } from 'phd-common';

@Injectable()
export class BrandService
{
	private _ds: string = encodeURIComponent('$');

	constructor(private _http: HttpClient) { }

    /**
	 * Returns a financial brand based on a financial brand id
	 * Used in the following places
     *  -  Choice Admin to Generic Design Preview link
     *  -  Sales Portal to Generic Design Preview link
     *  -  Design Tool to Buyer Specific Design Preview link
	 * @param id        // Financial brand id
	 * @param apiUrl    // apiUrl provided by environment of specific application
	 */
	getFinancialBrand(id: number, apiUrl: string): Observable<FinancialBrand>
	{
		const entity = `financialBrands`;
		const filter = `id eq ${id}`;
		const select = `id, key, name`;

		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		const url = `${apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				const brand = response.value as FinancialBrand[];

				return brand.pop();
			}),
			catchError(error =>
				{
					console.error(error);
	
					return _throw(error);
				})
		);
	}
}
