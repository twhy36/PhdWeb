import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, Subject, ConnectableObservable } from 'rxjs';
import { map, catchError, publishReplay } from 'rxjs/operators';
import { _throw } from 'rxjs/observable/throw';
import { IOptionCommunity } from '../../shared/models/option.model';
import { environment } from '../../../../environments/environment';
@Injectable()
export class OptionService
{
    constructor(private _http: HttpClient) { }
	private _ds: string = encodeURIComponent('$');
	
	getOptionsCategorySubcategoryByCommunity(financialCommunityId: number): Observable<IOptionCommunity[]>
	{
		const entity = `optionCommunities`;
		const expand = `optionSubCategory($select=id,name;$expand=optionCategory($select=id,name))`;
		const filter = `FinancialCommunityId eq ${financialCommunityId}`;
		const select = `FinancialCommunityId,isActive,optionSubCategoryId`;

		let qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		
		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
		map(response =>
			{
				const communities = response.value as Array<IOptionCommunity>;
				return communities;
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
