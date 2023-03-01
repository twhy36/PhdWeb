import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { Plan, withSpinner } from 'phd-common';

import { environment } from '../../../../environments/environment';
import { OptionService } from './option.service';
import { DTreeVersionDto, ODataResponse, PlanCommunityDto } from '../../shared/models/odata-response.model';
import { PlanCommunity } from '../../shared/models/plan-community.model';


@Injectable()
export class PlanService
{
	constructor(private _http: HttpClient, private optionService: OptionService) { }

	getSelectedPlan(planId: number): Observable<Plan[]>
	{
		const entity = 'planCommunities';
		const expand = 'webSitePlanCommunityAssocs($expand=webSitePlan($select=webSitePlanIntegrationKey))';
		const filter = `id eq ${planId}`;
		const select = 'id, financialPlanIntegrationKey, financialCommunityId, planSalesName, bedrooms, fullBaths, halfBaths, squareFeet, productType, foundation, garageConfiguration, masterBedLocation, productConfiguration, planSalesDescription';

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<ODataResponse<PlanCommunityDto[]>>(endPoint).pipe(
			map(response => 
			{
				return response.value.map(data => 
				{
					const plan = this.mapPlan(data);
					plan.marketingPlanId = data['webSitePlanCommunityAssocs'].map(p => p.webSitePlan.webSitePlanIntegrationKey);

					return plan;
				}) as Plan[];
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	//get treeversion ID per passing FinancialCommunityId and plan integration key
	//return 0 if error our no published tree found, otherwise get ID per top 1 latest published tree
	getPublishedTree(commId: number, planKey: number): Observable<number> 
	{
		let url = environment.apiUrl;
		const utcNow = new Date().toISOString();

		const filter = `publishStartDate le ${utcNow} and (publishEndDate eq null or publishEndDate gt ${utcNow}) and dTree/plan/org/edhFinancialCommunityId eq ${commId} and dTree/plan/integrationKey eq '${planKey}'`;
		const select = 'dTreeVersionID';
		const orderBy = 'publishStartDate desc'

		const qryStr = `${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}&${encodeURIComponent('$')}orderBy=${encodeURIComponent(orderBy)}`;

		url += `dTreeVersions?${qryStr}`;

		return withSpinner(this._http).get<ODataResponse<DTreeVersionDto[]>>(url).pipe(
			map(response =>
			{
				return !!response.value.length ? response.value[0].dTreeVersionID : 0;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			}));
	}

	getPlanCommunityDetail(planCommunityId: number): Observable<PlanCommunity>
	{

		const entity = 'planCommunities';
		const filter = `id eq ${planCommunityId}`;
		const expand = 'financialCommunity($select=id, name, number, financialBrandId)';
		const select = 'id, financialPlanIntegrationKey,  financialCommunityId, planSalesName, isActive';

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<ODataResponse<PlanCommunityDto[]>>(endPoint).pipe(
			switchMap(resp =>
			{
				const planComm = this.mapPlanCommunity(resp.value[0]);

				return this.getPublishedTree(planComm.communityId, planComm.planKey)
					.pipe(
						map(treeChk =>
						{
							planComm.dTreeVersionId = treeChk;
							return planComm;
						})
					);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getWebPlanMappingByPlanId(planId: number): Observable<Array<number>>
	{
		const filter = `id eq ${planId}`;
		const expand = 'webSitePlanCommunityAssocs($expand=webSitePlan($select=webSitePlanIntegrationKey))';
		const select = 'id,webSitePlanCommunityAssocs';

		const url = `${environment.apiUrl}planCommunities?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<ODataResponse<PlanCommunityDto[]>>(url).pipe(
			map(resp => !!resp.value.length ? resp.value[0].webSitePlanCommunityAssocs.map(p => p.webSitePlan.webSitePlanIntegrationKey) : []),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	public getPlanByPlanKey(planKey: string, financialCommunityId: number, optionIds: string[]): Observable<Plan>
	{
		optionIds.push('00001'); // include base house key

		const filter = `financialPlanIntegrationKey eq '${planKey}' and financialCommunityId eq ${financialCommunityId}`;
		const url = `${environment.apiUrl}planCommunities?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}`;

		return withSpinner(this._http).get<ODataResponse<PlanCommunityDto[]>>(url).pipe(
			switchMap(resp =>
			{
				const plan = this.mapPlan(resp.value[0]);

				return this.optionService.getPlanOptions(plan.id, optionIds)
					.pipe(
						map(optionsResponse =>
						{
							if (optionsResponse && optionsResponse.length > 0)
							{
								plan.price = optionsResponse.reduce((sum, opt) => sum += (opt.listPrice || 0), 0);
							}

							return plan;
						})
					);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getWebPlanMapping(planKey: string, financialCommunityId: number): Observable<Array<number>>
	{
		const filter = `financialPlanIntegrationKey eq '${planKey}' and financialCommunityId eq ${financialCommunityId}`;
		const expand = 'webSitePlanCommunityAssocs($expand=webSitePlan($select=webSitePlanIntegrationKey))';
		const select = 'id,webSitePlanCommunityAssocs';

		const url = `${environment.apiUrl}planCommunities?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<ODataResponse<PlanCommunityDto[]>>(url).pipe(
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

	private mapPlanCommunity(data): PlanCommunity
	{
		return {
			planCommunityId: data['id'],
			dTreeVersionId: 0,
			planKey: data['financialPlanIntegrationKey'],
			planName: data['planSalesName'],
			communityName: data['financialCommunity'].name,
			communityId: data['financialCommunity'].id,
			isActive: data['isActive'],
			hasPublishedTree: false,
			communityKey: data['financialCommunity'].number,
			brandId: data['financialCommunity'].financialBrandId
		} as PlanCommunity;
	}
}
