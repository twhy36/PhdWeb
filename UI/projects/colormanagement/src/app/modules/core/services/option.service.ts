import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, Subject, ConnectableObservable } from 'rxjs';
import { map, catchError, publishReplay, groupBy, mergeMap, toArray, distinct } from 'rxjs/operators';
import { _throw } from 'rxjs/observable/throw';
import { IOptionSubCategory, IOptionCategory } from '../../shared/models/option.model';
import { environment } from '../../../../environments/environment';
import { zip } from 'rxjs';
import { of } from 'rxjs';
@Injectable()
export class OptionService
{
    constructor(private _http: HttpClient) { }
	private _ds: string = encodeURIComponent('$');
	
	getOptionsCategorySubcategory(financialCommunityId: number): Observable<IOptionSubCategory[]>
	{
		const entity = `optionSubCategories`;
		const expand = `optionCategory($select=id,name)`;
		const filter = `optionCommunities/any(oc: oc/financialCommunityId eq ${financialCommunityId})`;
		const select = `id,name`;

		let qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		
		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response =>
				{
					let subCategoryList = response.value as Array<IOptionSubCategory>;
					// sort by categoryname and then by subcategoryname
					return subCategoryList.sort((a, b) =>
					{
						let aName = a.optionCategory.name.toLowerCase();
						let bName = b.optionCategory.name.toLowerCase();

						if (aName < bName)
						{
							return -1;
						}

						if (aName > bName)
						{
							return 1;
						}
						
						if(aName = bName){
							let aSubName = a.name.toLowerCase();
							let bSubName = b.name.toLowerCase();
		
							if (aSubName < bSubName)
							{
								return -1;
							}
		
							if (aSubName > bSubName)
							{
								return 1;
							}
		
							return 0;
						}
						return 0;
					});
				}), 
		catchError(this.handleError));
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error('Error message: ', error);

		return _throw(error || 'Server error');
	}
}
