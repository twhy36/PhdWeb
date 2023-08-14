import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, EMPTY as empty, throwError as _throw, of, combineLatest } from 'rxjs';
import { map, catchError, flatMap, toArray, switchMap, take } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { withSpinner, SalesCommunity, Plan, FeatureSwitchService, IFeatureSwitchOrgAssoc, TreeService } from 'phd-common';

import { OptionService } from './option.service';

@Injectable()
export class PlanService
{
	constructor(
		private _http: HttpClient,
		private optionService: OptionService,
		private treeService: TreeService,
		private featureSwitchService: FeatureSwitchService) { }

	private getPlans(salesCommunity: SalesCommunity): Observable<Plan[]>
	{
		let includedPlanOptions: string[] = [];

		const baseHouseKey = '00001';
		const communityIds = salesCommunity.financialCommunities.map(c => c.id);

		return combineLatest([
				this.treeService.getTreeVersionsByCommIds(communityIds),
				this.getCommunityPlans(salesCommunity.id),
				this.featureSwitchService.getFeatureSwitchForCommunities('Phd Lite', communityIds)
			])
			.pipe
			(
				take(1),
				switchMap(([treeVersions, plans, communityFlags]: [any, Plan[], IFeatureSwitchOrgAssoc[]]) =>
				{
					return from(plans)
						.pipe(
							flatMap(plan =>
							{
								const activePlans = treeVersions.find(p => p.planKey === plan.integrationKey && p.communityId === plan.communityId);
								const isLiteEnabledCommunity = communityFlags?.find(cf => cf.org?.edhFinancialCommunityId === plan.communityId)?.state || false;

								if (activePlans != null || isLiteEnabledCommunity)
								{
									includedPlanOptions = activePlans?.includedOptions || [];

									plan.treeVersionId = activePlans?.id || null;
									plan.treePlanId = activePlans?.planId || null;

									includedPlanOptions.push(baseHouseKey);

									const getOptionImages = plan.treeVersionId
										? this.treeService.getOptionImages(plan.treeVersionId, includedPlanOptions, null, true)
										: of([]);

									return combineLatest([
										this.optionService.getPlanOptions(plan.id, includedPlanOptions, true),
										getOptionImages
									])
										.pipe(
											map(([optionsResponse, optionImages]) =>
											{
												if (optionsResponse && optionsResponse.length > 0)
												{
													// DEVNOTE: currently only returning where baseHouseKey = '00001'
													// In a future sprint, we'll be pushing more id's from the treeVersion.include options.
													plan.price = optionsResponse[0].listPrice;
												}

												plan.baseHouseElevationImageUrl = optionImages?.length > 0 ? optionImages[0].imageURL : '';

												return plan;
											})
										);
								}
								else
								{
									return empty;
								}

							})
							, toArray()
						);
				})
				, catchError(error =>
				{
					console.error(error);

					return _throw(error);
				}));
	}

	private getBaseHouseElevationImage(planId: number, marketId: number): Observable<string>
	{
		const func = `GetPlanBaseHouseElevationImage(planId=${planId},marketId=${marketId})`;
		return this._http.get<any>(environment.apiUrl + func).pipe(
			map(response => response.value),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	/**
	 * Gets all plans for all financial communities within a sales community
	 * @param salesCommunityId
	 */
	private getCommunityPlans(salesCommunityId: number): Observable<Plan[]>
	{
		const entity = 'planCommunities';
		const expand = `financialCommunity($select=id,salesCommunityId),lotPlanAssocs($select=id,lotId,isActive,planId;$filter=isActive eq true),webSitePlanCommunityAssocs($expand=webSitePlan($select=webSitePlanIntegrationKey))`;
		let filter = `financialCommunity/salesCommunityId eq ${salesCommunityId} and productType ne 'MultiUnit Shell'`;

		const select = `id, financialPlanIntegrationKey, financialCommunityId, planSalesName, bedrooms, fullBaths, halfBaths, squareFeet, productType, foundation, garageConfiguration, masterBedLocation, productConfiguration, planSalesDescription, isActive`;
		const orderBy = `planSalesName`;

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}&${encodeURIComponent("$")}orderby=${orderBy}`;

		return this._http.get<any>(endPoint).pipe(
			map(response =>
			{
				return response.value.map(data =>
				{
					const plan = this.mapPlan(data);
					plan.marketingPlanId = data['webSitePlanCommunityAssocs'].map(p => p.webSitePlan.webSitePlanIntegrationKey);
					plan.lotAssociations = data['lotPlanAssocs'].map(l => l.lotId);

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

	loadPlans(salesCommunityId: number): Observable<Array<Plan>>
	{
		if (!salesCommunityId)
		{
			return empty;
		}

		const filter = `id eq ${salesCommunityId}`;
		const expand = `financialCommunities($select=id,name,salesStatusDescription;$filter=salesStatusDescription eq 'Active')`;
		const url = `${environment.apiUrl}salesCommunities?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=id,number,marketId`;

		return this._http.get<any>(url).pipe(
			switchMap(resp =>
			{
				const sc = resp.value[0] as SalesCommunity;

				return this.getPlans(sc);
			}),
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

		return this._http.get<any>(url).pipe(
			switchMap(resp =>
			{
				let plan = this.mapPlan(resp.value[0]);

				return this.optionService.getPlanOptions(plan.id, optionIds, true)
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
		const expand = `webSitePlanCommunityAssocs($expand=webSitePlan($select=webSitePlanIntegrationKey))`;
		const select = `id,webSitePlanCommunityAssocs`;

		const url = `${environment.apiUrl}planCommunities?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		//return of([686440]);
		return withSpinner(this._http).get<any>(url).pipe(
			map(resp => !!resp.value.length ? resp.value[0]['webSitePlanCommunityAssocs'].map(p => p.webSitePlan.webSitePlanIntegrationKey) : []),
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
		const expand = `webSitePlanCommunityAssocs($expand=webSitePlan($select=webSitePlanIntegrationKey))`;
		const select = `id,webSitePlanCommunityAssocs`;

		const url = `${environment.apiUrl}planCommunities?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		//return of([686440]);
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
			communityId: data['financialCommunityId'],
			isActive: data['isActive']
		} as Plan;
	}
}
