import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, ConnectableObservable } from 'rxjs';
import { map, catchError, publishReplay, groupBy, mergeMap, toArray, distinct } from 'rxjs/operators';
import { _throw } from 'rxjs/observable/throw';
import { environment } from '../../../../environments/environment';
import { IPlanCommunity, IOptionCommunity, IPlanOptionCommunity } from '../../shared/models/community.model';
import { withSpinner } from 'phd-common';

@Injectable()
export class PlanOptionService {
	private _ds: string = encodeURIComponent('$');
	constructor(private _http: HttpClient) { }

	getPlanCommunities(financialCommunityId: number) {
		const entity = `planCommunities`;
		const filter = `financialCommunityId eq ${financialCommunityId} and productType ne 'MultiUnit Shell'`
		const select = `id,planSalesName`
		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(endpoint).pipe(
			map(response => {

				let planCommunityList = response.value as Array<IPlanCommunity>;

				return planCommunityList.sort((a, b) => {
					let aName = a.planSalesName.toLowerCase();
					let bName = b.planSalesName.toLowerCase();

					return aName.localeCompare(bName);
				});
			}),
			catchError(this.handleError)
		)
	}

	getPlanOptions(financialCommunityId: number, planIds?: number[]) {
		const entity = `optionCommunities`;
		const select = `id, optionSalesName`;
		const orderBy = `optionSalesName asc`;

		let qryStr = `${this._ds}select=${encodeURIComponent(select)}`;
		qryStr += `&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		let filter = `financialCommunityId eq ${financialCommunityId} and isActive eq true`;

		if (planIds?.length > 0) {
			filter += ` and planOptionCommunities/any(x: x/planId in (${planIds.join()}))`;
		}
		else {
			filter += ` and planOptionCommunities/any()`;
		}

		qryStr += `&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}`;

		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(endpoint).pipe(
			map(response => {
				const optionCommunities = response.value.map(x => x) as Array<IOptionCommunity>;
				return optionCommunities;	
			}),
			catchError(this.handleError)
		)
	}

	getPlanOptionsGrid(financialCommunityId: number, optionCommunityId?: number, planIds?: number[], topRows?: number, skipRows?: number): Observable<IPlanOptionCommunity[]>
	{
		const entity = `planOptionCommunities`;
		const select = `Id`;
		const expand =  `planCommunity($select=Id,planSalesName),optionCommunity($select=Id,optionSalesName)`;
		const orderBy = `planCommunity/planSalesName,optionCommunity/optionSalesName asc`;

		let qryStr = `${this._ds}select=${encodeURIComponent(select)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;
		let filter = ``;
		let filtersList = [];
				
		if (planIds?.length > 0) 
		{
			let planFilter=[];
			planIds.map(id =>
				{
					planFilter.push(` planId eq ${id}`);
				});
			filtersList.push(`(${planFilter.join(' or ')})`);
		}
		else
		{
			//Get all plans when null
			filtersList.push(`(planCommunity/financialCommunityId eq ${financialCommunityId} and planCommunity/productType ne 'MultiUnit Shell')`)
		}

		if (optionCommunityId)
		{			
			filtersList.push(`optionCommunityId eq ${optionCommunityId}`);
		}
		else
		{
			//Get all options when null
			filtersList.push(`(optionCommunity/financialCommunityId eq ${financialCommunityId} and optionCommunity/isActive eq true)`)
		}

		filter = filtersList.join(' and ');

		qryStr += `&${this._ds}filter=${encodeURIComponent(filter)}`;
		
		if (topRows)
		{
			qryStr += `&${this._ds}top=${topRows}`;
		}

		if (skipRows)
		{
			qryStr += `&${this._ds}skip=${skipRows}`;
		}
		
		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(endpoint).pipe(
			map(response => {
				const planOptionCommunities = response.value as Array<IPlanOptionCommunity>
				return planOptionCommunities;	
			}),
			catchError(this.handleError)
		)
	}
	private handleError(error: Response) {
		// In the future, we may send the server to some remote logging infrastructure.
		console.error('Error message: ', error);

		return _throw(error || 'Server error');
	}
}
