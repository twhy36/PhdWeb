import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { SettingsService } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';

import { IPlan } from '../../shared/models/plan.model';
import { Settings } from '../../shared/models/settings.model';
import { LoggingService } from 'phd-common';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class PlanService
{
	private _ds: string = encodeURIComponent('$');

	get currentPlan(): string
	{
		return this._storageService.getLocal<string>('CA_CURRENT_PLAN');
	}

	set currentPlan(val: string)
	{
		this._storageService.setLocal('CA_CURRENT_PLAN', val);
	}

	constructor(private _http: HttpClient, private _loggingService: LoggingService, private _storageService: StorageService) { }

	getCommunityPlan(planKey: string, commId: number): Observable<IPlan>
	{
		const entity = `planCommunities`
		const expand = `financialCommunity($select=id, number, marketId; $expand=market($select=id, number))`;
		const filter = `financialPlanIntegrationKey eq '${planKey}' and financialCommunity/id eq ${commId}`;
		const select = `id, financialPlanIntegrationKey, planSalesName, bedrooms, fullBaths, halfBaths, squareFeet`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response =>
			{
				const plans = response.value;
				const plan = plans && plans.length > 0 ? plans[0] : null;

				return plan;
			}),
			catchError(this.handleError));
	}

	getCommunityPlans(commId: number): Observable<Array<IPlan>>
	{
		let url = settings.apiUrl;

		const filter = `financialCommunityId eq ${commId} and productType ne 'MultiUnit Shell'`;
		const select = `id, financialPlanIntegrationKey, planSalesName, bedrooms, fullBaths, halfBaths, squareFeet, financialCommunityId, isActive`;
		const orderBy = `planSalesName`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		url += `planCommunities?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				let plans = response.value.map(plan =>
				{
					return {
						id: plan.id,
						financialPlanIntegrationKey: plan.financialPlanIntegrationKey,
						planSalesName: plan.planSalesName,
						bedrooms: plan.bedrooms,
						fullBaths: plan.fullBaths,
						halfBaths: plan.halfBaths,
						squareFeet: plan.squareFeet,
						isActive: plan.isActive
					};
				}) as Array<IPlan>;

				return plans;
			}),
			catchError(this.handleError));
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}
