import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError} from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IOptionSubCategory } from '../../shared/models/option.model';
import { environment } from '../../../../environments/environment';
import {IColor} from '../../shared/models/color.model';

@Injectable()
export class OptionService {
	constructor(private _http: HttpClient) {}
	private _ds: string = encodeURIComponent('$');

	getOptionsCategorySubcategory(
		financialCommunityId: number
	): Observable<IOptionSubCategory[]> {
		const entity = `optionSubCategories`;
		const expand = `optionCategory($select=id,name)`;
		const filter = `optionCommunities/any(oc: oc/financialCommunityId eq ${financialCommunityId})`;
		const select = `id,name`;

		let qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${
			this._ds
		}filter=${encodeURIComponent(filter)}&${
			this._ds
		}select=${encodeURIComponent(select)}`;

		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map((response) => {
				let subCategoryList =
					response.value as Array<IOptionSubCategory>;
				// sort by categoryname and then by subcategoryname
				return subCategoryList.sort((a, b) => {
					let aName = a.optionCategory.name.toLowerCase();
					let bName = b.optionCategory.name.toLowerCase();

					if (aName < bName) {
						return -1;
					}

					if (aName > bName) {
						return 1;
					}

					if ((aName === bName)) {
						let aSubName = a.name.toLowerCase();
						let bSubName = b.name.toLowerCase();

						if (aSubName < bSubName) {
							return -1;
						}

						if (aSubName > bSubName) {
							return 1;
						}

						return 0;
					}
					return 0;
				});
			}),
			catchError(this.handleError)
		);
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error('Error message: ', error);

		return throwError(error || 'Server error');
	}

	saveNewColors(colors: IColor[]): Observable<IColor[]>
	{
		const body = {
			'newColors': colors
		};

		const action = `saveNewColors`;
		const endpoint = `${environment.apiUrl}${action}`;

		return this._http.post<any>(endpoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response.value;
			}),
			catchError(this.handleError)
		);
	}
}
