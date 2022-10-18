import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';

import { catchError, map } from 'rxjs/operators';

import { SettingsService } from './settings.service';

import { IPlanDto, Plan } from '../../shared/models/plan.model';
import { Settings } from '../../shared/models/settings.model';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class PlanService
{
	constructor(
		private _http: HttpClient
	) { }

	getCommunityPlans(financialCommunityId: number): Observable<Array<IPlanDto>>
	{
		let url = settings.apiUrl;

		let filter = `financialCommunityId eq ${financialCommunityId} and isActive eq true and productType ne 'MultiUnit Shell'`;
		let select = `id, financialPlanIntegrationKey, planSalesName, bedrooms, fullBaths, halfBaths, squareFeet`;
		let orderby = 'planSalesName';
		url += `planCommunities?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}orderby=${encodeURIComponent(orderby)}`;

		return this._http.get(url).pipe(
			map((response: any) =>
				{
					let retVal = response.value.map(data =>
					{
						return this.mapPlans(data, financialCommunityId);
					});

					return retVal as Array<IPlanDto>;
			}),
			catchError(this.handleError));
	}

	getPlans(orgID: number): Observable<Array<Plan>>
	{
		let url = settings.apiUrl;

		let filter = `communityId eq ${orgID}`;
		url += `plans?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}`;

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				let retVal = response.value.map(data =>
				{
					return {
						planID: data.planID,
						communityID: data.communityID,
						integrationKey: data.integrationKey
					}
				});

				return retVal as Array<Plan>;
			}),
			catchError(this.handleError));
	}

	getDesignPreviewLink(planId: number): Observable<string>
	{
		// send org id 
		let url = settings.apiUrl;
		url += `GetDesignPreviewLink(planId=${planId})`;

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				return response.value as string;
			}),
			catchError(this.handleError));
	}

	private mapPlans(data: any, financialCommunityId: number): IPlanDto
	{
		return {
			id: data.id,
			salesName: data.planSalesName,
			integrationKey: data.financialPlanIntegrationKey,
			numBed: data.bedrooms,
			numFullBath: data.fullBaths,
			numHalfBath: data.halfBaths,
			squareFeet: data.squareFeet,
			communityId: financialCommunityId
		} as IPlanDto;
	}

	private emptyPlan(financialCommunityId: number): IPlanDto
	{
		return {
			id: 0,
			salesName: '',
			integrationKey: '',
			numBed: 0,
			numFullBath: 0,
			numHalfBath: 0,
			squareFeet: 0,
			communityId: financialCommunityId
		} as IPlanDto;
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}//
