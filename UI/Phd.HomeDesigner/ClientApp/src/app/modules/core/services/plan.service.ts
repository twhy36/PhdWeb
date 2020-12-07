import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

import { Plan } from '../../shared/models/plan.model';

@Injectable()
export class PlanService
{
	constructor(private _http: HttpClient) { }

	getSelectedPlan(planId: number): Observable<Plan[]> {
		const entity = 'planCommunities';
		const expand = `webSitePlanCommunityAssocs($expand=webSitePlan($select=webSitePlanIntegrationKey))`;
		const filter = `id eq ${planId}`;
		const select = `id, financialPlanIntegrationKey, financialCommunityId, planSalesName, bedrooms, fullBaths, halfBaths, squareFeet, productType, foundation, garageConfiguration, masterBedLocation, productConfiguration, planSalesDescription`;

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;

		return this._http.get<any>(endPoint).pipe(
			map(response => {
				return response.value.map(data => {
					const plan = this.mapPlan(data);
					plan.marketingPlanId = data['webSitePlanCommunityAssocs'].map(p => p.webSitePlan.webSitePlanIntegrationKey);

					return plan;
				}) as Plan[];
			}),
			catchError(error => {
				console.error(error);

				return _throw(error);
			})
		);
	}

	getWebPlanMappingByPlanId(planId: number): Observable<Array<number>>
	{
		const filter = `id eq ${planId}`;
		const expand = `webSitePlanCommunityAssocs($expand=webSitePlan($select=webSitePlanIntegrationKey))`;
		const select = `id,webSitePlanCommunityAssocs`;

		const url = `${environment.apiUrl}planCommunities?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return this._http.get<any>(url).pipe(
			map(resp => !!resp.value.length ? resp.value[0]['webSitePlanCommunityAssocs'].map(p => p.webSitePlan.webSitePlanIntegrationKey) : []),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	private mapPlan(data): Plan
	{
		return {
			id: data['id'],
			salesName: data['planSalesName'],
			numBed: data['bedrooms'],
			numFullBath: data['fullBaths'],
			numHalfBath: data['halfBaths'],
			squareFeet: data['squareFeet'],
			foundation: data['foundation'],
			garageConfiguration: data['garageConfiguration'],
			masterBedLocation: data['masterBedLocation'],
			productConfiguration: data['productConfiguration'],
			productType: data['productType'],
			salesDescription: data['planSalesDescription'],
			integrationKey: data['financialPlanIntegrationKey'],
			communityId: data['financialCommunityId']
		} as Plan;
	}
}
