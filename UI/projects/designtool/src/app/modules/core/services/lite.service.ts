import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError as _throw } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { withSpinner } from 'phd-common';

import { map, catchError } from 'rxjs/operators';
import { LitePlanOption, ScenarioOption } from '../../shared/models/lite.model';

@Injectable()
export class LiteService
{
	private _ds: string = encodeURIComponent("$");

    constructor(private _http: HttpClient) { }
        
	getLitePlanOptions(planId: number, optionIds?: Array<string>, skipSpinner?: boolean): Observable<LitePlanOption[]>
	{
		let filterOptions = '';

		if (optionIds != null)
		{
			filterOptions = " and (" + optionIds.map(id => `optionCommunity/option/financialOptionIntegrationKey eq '${id}'`).join(' or ') + ")";
		}

		const entity = 'planOptionCommunities';
		const expand = `optionCommunity($expand=option($select=financialOptionIntegrationKey,id); $select=optionSalesName,optionDescription,option,id,optionSubCategoryId)`;
		const filter = `planId eq ${planId}${filterOptions}`;
		const select = `id, planId, optionCommunity, maxOrderQty, listPrice, isActive, isBaseHouse, isBaseHouseElevation`;

		const endPoint = environment.apiUrl + `${entity}?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		return (skipSpinner ? this._http : withSpinner(this._http)).get(endPoint).pipe(
			this.mapOptions(),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
    }
    
	private mapOptions = () => (source: Observable<any>) =>
		source.pipe(
			map((response: any) =>
			{
				return response.value.map(data =>
				{
					return {
						id: data['id'],
						name: data['optionCommunity']['optionSalesName'],
						isActive: data['isActive'],
						listPrice: data['listPrice'] || 0,
						maxOrderQuantity: data['maxOrderQty'],
						isBaseHouse: data['isBaseHouse'],
						isBaseHouseElevation: data['isBaseHouseElevation'],
						attributeGroups: [],
						locationGroups: [],
						financialOptionIntegrationKey: data['optionCommunity']['option']['financialOptionIntegrationKey'],
						description: data['optionCommunity']['optionDescription'],
						optionImages: [],
						planId: data['planId'] ? data['planId'] : 0,
                        communityId: data['communityId'] ? data['communityId'] : 0,
                        optionSubCategoryId: data['optionCommunity']['optionSubCategoryId']
					} as LitePlanOption;
				}) as LitePlanOption[];
			})
        );
		  
	getScenarioOptions(scenarioId: number) : Observable<ScenarioOption[]>
	{
		const entity = `scenarioOptions`;
		const filter = `scenarioId eq ${scenarioId}`;

		const endpoint = `${environment.apiUrl}${entity}?${this._ds}filter=${encodeURIComponent(filter)}`;

		return withSpinner(this._http).get<any>(endpoint).pipe(
			map(results =>
			{
				return results['value'];
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);		
	}

	saveScenarioOptions(scenarioId: number, opportunityId: string,  scenarioOptions: ScenarioOption[]) : Observable<ScenarioOption[]>
	{
		const endpoint = environment.apiUrl + `SaveScenarioOptions`;

		let data = {
			scenarioId: scenarioId,
			opportunityId: opportunityId,
			scenarioOptions: scenarioOptions
		};

		return this._http.post(endpoint, data).pipe(
			map(response =>
			{
				return response['value'];
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);		
	}	
}
