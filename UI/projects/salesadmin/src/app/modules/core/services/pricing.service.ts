import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { catchError, map, switchMap } from 'rxjs/operators';
import { throwError as _throw, Observable } from 'rxjs';

import { MessageService } from 'primeng/api';
import { SettingsService } from './settings.service';

import { Settings } from '../../shared/models/settings.model';
import { IPlanDto, PlanDto } from '../../shared/models/plan.model';
import { ISalesPhasePlan, ILot } from '../../shared/models/pricing.model';
import { ISalesPhase } from '../../shared/models/pricing.model';
import { withSpinner } from 'phd-common';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class PricingService
{
	private settings: Settings;

	constructor(
		private _http: HttpClient,
		private _settingsService: SettingsService,
		private _msgService: MessageService
	)
	{
		this.settings = _settingsService.getSettings();
	}

	getCommunityPlans(communityId: number): Observable<Array<ISalesPhasePlan>>
	{
		let url = this.settings.apiUrl;

		const expand = `planOptionCommunities($filter=isBaseHouse eq true)`;
		const filter = `financialCommunityId eq ${communityId} and productType ne 'MultiUnit Shell'`;

		const qryStr = `${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}`;

		url += `planCommunities?${qryStr}`;


		return this._http.get(url).pipe(
			map((response: any) =>
			{
				return response.value.map(plan => <ISalesPhasePlan>{
					listPrice: plan.planOptionCommunities.length ? plan.planOptionCommunities[0].listPrice : null,
					plan: {
						id: plan.id,
						salesName: plan.planSalesName,
						isActive: plan.isActive
					}
				});
			}),
			catchError(this.handleError)
		);
	}

	getCommunitySalesPhases(communityId: number): Observable<Array<ISalesPhase>>
	{

		let url = this.settings.apiUrl;

		const expand = `salesPhasePlanPriceAssocs,lots($select=id,lotStatusDescription,lotBlock,salesPhaseId)`;
		const filter = `financialCommunityId eq ${communityId}`;
		const select = `id,salesPhaseName,salesPhasePlanPriceAssocs,financialCommunityId,createdUtcDate`;
		const orderby = 'createdUtcDate';

		const qryStr = `${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}&${encodeURIComponent("$")}orderby=${orderby}`;

		url += `salesPhases?${qryStr}`

		return withSpinner(this._http).get(url).pipe(
			map((response: any) =>
			{
				return response.value.map(phase => <ISalesPhase>
					{
						id: phase.id,
						salesPhaseName: phase.salesPhaseName,
						lots: phase.lots,
						phasePlans: phase.salesPhasePlanPriceAssocs.map(pp => <ISalesPhasePlan>{
							listPrice: pp.price,
							plan: {
								id: pp.planId
							}
						})
					}
				);
			}),
			catchError(this.handleError)
		);
	}

	getCommunityLots(communityId: number): Observable<Array<ILot>>
	{
		let url = this.settings.apiUrl;

		const select = `id,lotBlock,lotStatusDescription,salesPhaseId,financialCommunityId,lotBuildTypeDesc`;
		const filter = `financialCommunityId eq ${communityId}`;

		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;

		url += `lots?${qryStr}`;

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				return response.value.map(lot => <ILot>
					{
						id: lot.id,
						salesPhaseId: lot.salesPhaseId,
						lotBlock: lot.lotBlock,
						lotStatusDescription: lot.lotStatusDescription,
						lotBuildTypeDescription: lot.lotBuildTypeDesc,
					});
			}),
			catchError(this.handleError)
		);
	}

	/**
   * Enable Phase Price
   * @param IPlanDto
   */
	enablePhasePricing(commId: number, enabled: boolean): Observable<IPlanDto>
	{
		let dto = {
			id: commId,
			isPhasedPricingEnabled: enabled,
		};

		let url = settings.apiUrl;

		url += `financialCommunities(${commId})`;

		return this._http.patch<IPlanDto>(url, dto).pipe(
			map(() =>
			{
				const planDto = new PlanDto();
				planDto.id = dto.id;

				return planDto;
			}),
			catchError(error => this.handleError(error)));
	}

	saveSalesPhase(salesPhase: ISalesPhase, oldSalesPhaseLotAssoc: ILot[], commId: number): Observable<ISalesPhase>
	{
		let url = settings.apiUrl + `salesPhases` + (salesPhase.id ? `(${salesPhase.id})` : ``);

		let body = {
			'financialCommunityId': commId,
			'salesPhaseName': salesPhase.salesPhaseName,
			'prices': salesPhase.phasePlans.map(pp => <any>{ price: pp.listPrice, planId: pp.plan.id, salesPhaseId: salesPhase.id || 0 }),
			'salesPhaseLots': salesPhase.lots.map(l => <any>{ id: l.id, salesPhaseId: l.salesPhaseId, lotBlock: l.lotBlock, lotStatusDescription: l.lotStatusDescription }),
			'oldSalesPhaseLotAssoc': oldSalesPhaseLotAssoc.map(l => <any>{ id: l.id, salesPhaseId: l.salesPhaseId, lotBlock: l.lotBlock, lotStatusDescription: l.lotStatusDescription })
		};

		if (salesPhase.id)
		{
			return this._http.patch<any>(url, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
				//pull updated sales phases. only doing this because salesPhasePlanPriceAssocs aren't getting serialized on the Created response body
				switchMap(response =>
				{
					return this.getUpdatedSalesPhase(response);
				}));
		}
		else
		{
			return this._http.post<any>(url, body).pipe(
				//pull updated sales phases. only doing this because salesPhasePlanPriceAssocs aren't getting serialized on the Created response body
				switchMap(response =>
				{
					return this.getUpdatedSalesPhase(response);
				}));
		}
	}

	getUpdatedSalesPhase(response)
	{
		let url = this.settings.apiUrl;

		const expand = `salesPhasePlanPriceAssocs,lots($select=id,lotStatusDescription,lotBlock,salesPhaseId)`;
		const filter = `id eq ${response.id}`;
		const select = `id,salesPhaseName,salesPhasePlanPriceAssocs,financialCommunityId,createdUtcDate`;

		const qryStr = `${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;

		url += `salesPhases?${qryStr}`

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				return response.value.map(phase => <ISalesPhase>{
					id: phase.id,
					salesPhaseName: phase.salesPhaseName,
					lots: phase.lots,
					phasePlans: phase.salesPhasePlanPriceAssocs.map(pp => <ISalesPhasePlan>{
						listPrice: pp.price,
						plan: {
							id: pp.planId
						}
					})
				})[0];
			}),
			catchError(this.handleError));
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}//
