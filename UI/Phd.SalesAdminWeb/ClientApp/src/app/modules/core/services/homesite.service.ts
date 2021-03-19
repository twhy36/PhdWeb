import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Settings } from '../../shared/models/settings.model';
import { HomeSiteDtos } from '../../shared/models/homesite.model';
import { withSpinner } from 'phd-common/extensions/withSpinner.extension';

import { SettingsService } from './settings.service';
import { MonotonyRule } from '../../shared/models/monotonyRule.model';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class HomeSiteService
{
	// TECH DEBT - Use list from EDH
	public viewAdjacencies: Array<HomeSiteDtos.ILabel> = [
		{ label: 'Base View', value: 'BaseView', id: 14 },
		{ label: 'City View', value: 'CityView', id: 8 },
		{ label: 'Corner', value: 'Corner', id: 7 },
		{ label: 'Cul De Sac', value: 'ColDeSac', id: 1 },
		{ label: 'Golf Course', value: 'GolfCourse', id: 3 },
		{ label: 'Lookout', value: 'Lookout', id: 11 },
		{ label: 'Nature/Preserve', value: 'Nature/Preserve', id: 6 },
		{ label: 'None', value: 'None', id: 16 },
		{ label: 'Open Space', value: 'OpenSpace', id: 13 },
		{ label: 'Other View', value: 'OtherView', id: 15 },
		{ label: 'Oversized', value: 'Oversized', id: 12 },
		{ label: 'Standard', value: 'Standard', id: 9 },
		{ label: 'View', value: 'View', id: 2 },
		{ label: 'Walkout', value: 'Walkout', id: 10 },
		{ label: 'Water View', value: 'WaterView', id: 5 },
		{ label: 'Waterfront', value: 'Waterfront', id: 4 }
	];

	public physicalLotTypes: Array<HomeSiteDtos.ILabel> = [
		{ label: 'Base', value: 'Base', id: 10 },
		{ label: 'Corner', value: 'Corner', id: 3 },
		{ label: 'Cul de sac', value: 'CulDeSac', id: 4 },
		{ label: 'End Unit', value: 'EndUnit', id: 11 },
		{ label: 'Extra Deep', value: 'ExtraDeep', id: 6 },
		{ label: 'Extra Wide', value: 'ExtraWide', id: 5 },
		{ label: 'Extra Wide and Deep', value: 'ExtraWideAndDeep', id: 7 },
		{ label: 'Interior Unit', value: 'InteriorUnit', id: 12 },
		{ label: 'Lookout', value: 'Lookout', id: 2 },
		{ label: 'Standard', value: 'Standard', id: 9 },
		{ label: 'Walkout', value: 'Walkout', id: 1 },
		{ label: 'Wedge', value: 'Wedge', id: 8 }
	];

	constructor(
		private _http: HttpClient
	) { }

	/**
	* Gets the homesites for the specified financial community
	* @param communityId {number} the community
	*/
	getCommunityHomeSites(communityId: number): Observable<Array<HomeSiteDtos.ILotDto>>
	{
		let url = settings.apiUrl;

		const expand = `planAssociations($select=id,isActive;$expand=planCommunity($select=id, financialPlanIntegrationKey)), salesPhase($select=id, salesPhaseName), financialCommunity($select=id, number, marketId; $expand=market($select=id, number)), lotHandingAssocs, lotViewAdjacencyAssocs($expand=viewAdjacency), lotPhysicalLotTypeAssocs($expand=physicalLotType)`;
		const filter = `financialCommunity/id eq ${communityId} and lotStatusDescription ne 'Deleted' and isMasterUnit eq false`;

		const qryStr = `${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}`;

		url += `lots?${qryStr}`;
		return withSpinner(this._http).get(url).pipe(
			map((response: any) =>
			{
				let retVal = response.value.map(data =>
				{
					let lotDto = this.mapLotDto(data);

					return lotDto;
				});

				return retVal as Array<HomeSiteDtos.ILotDto>;
			}), catchError(this.handleError));
	}

	getCommunityHomeSitesById(commLbIds: Array<number>): Observable<Array<HomeSiteDtos.ILotDto>>
	{
		let filter = '';
		let url = settings.apiUrl;

		const expand = `planAssociations($select=id,isActive;$expand=planCommunity($select=id, financialPlanIntegrationKey)), salesPhase($select=id, salesPhaseName), financialCommunity($select=id, number, marketId; $expand=market($select=id, number)), lotHandingAssocs, lotViewAdjacencyAssocs($expand=viewAdjacency), lotPhysicalLotTypeAssocs($expand=physicalLotType)`;
		const select = `id, financialCommunityId, lotBlock, lotCost, lotStatusDescription, lotBuildTypeDesc, foundationType, facing, premium, streetAddress1, streetAddress2, city, stateProvince, postalCode`;

		commLbIds.forEach(id =>
		{
			filter += filter.length > 0 ? ' or ' : '';
			filter += `id eq ${id}`;
		});

		const qryStr = `${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;

		url += `lots?${qryStr}`;

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				let retVal = response.value.map(data =>
				{
					return this.mapLotDto(data);
				});

				return retVal as Array<HomeSiteDtos.ILotDto>;
			}),
			catchError(this.handleError));
	}

	mapLotDto(data: any): HomeSiteDtos.ILotDto
	{
		let address = {
			streetAddress1: data.streetAddress1,
			streetAddress2: data.streetAddress2,
			city: data.city,
			stateProvince: data.stateProvince,
			postalCode: data.postalCode
		} as HomeSiteDtos.IAddress;

		let plans = data.planAssociations.filter(p => p.isActive).map(d =>
		{
			return d.planCommunity.id;
		});

		return {
			id: data.id,
			communityId: data.financialCommunityId,
			communityIntegrationKey: data.financialCommunity.number,
			lotBlock: data.lotBlock,
			altLotBlock: data.alternateLotBlock ? data.alternateLotBlock : '',
			lotCost: data.lotCost,
			lotStatusDescription: data.lotStatusDescription,
			lotBuildTypeDescription: data.lotBuildTypeDesc,
			foundationType: data.foundationType,
			lotHandings: data.lotHandingAssocs.map(h => { return { handingId: h.handingId }; }),
			facing: data.facing,
			phase: !!data.salesPhase ? data.salesPhase.salesPhaseName : null,
			premium: data.premium,
			address: address,
			plans: plans,
			edhWarrantyType: !!data.phdLotWarrantyId ? data.phdLotWarrantyId : '',
			view: data.lotViewAdjacencyAssocs &&
				data.lotViewAdjacencyAssocs[0] &&
				this.viewAdjacencies.find(item => item.label === data.lotViewAdjacencyAssocs[0].viewAdjacency.description) as HomeSiteDtos.ILabel || '',
			lotType: data.lotPhysicalLotTypeAssocs &&
				data.lotPhysicalLotTypeAssocs[0] &&
			this.physicalLotTypes.find(item => item.label === data.lotPhysicalLotTypeAssocs[0].physicalLotType.description) as HomeSiteDtos.ILabel || '',
			isMasterUnit: data.isMasterUnit
		} as HomeSiteDtos.ILotDto;
	}

	/**
	 * Saves the plan-lot assignment for the specified plan
	 * @param marketId
	 * @param communityId
	 * @param planId
	 * @param lotblocks
	 */
	savePlanLotAssignments(planId: number, lotblocks: Array<number>): Observable<Response>
	{
		let body = {
			'planId': planId,
			'lotIds': lotblocks
		};

		let url = settings.apiUrl;

		url += `AssignLotsToPlan`;

		return this._http.post(url, body).pipe(
			map((response: Response) =>
			{
				return response;
			}),
			catchError(this.handleError));
	}

	/**
	 * Save Homesite Properties
	 * @param homesiteDto
	 */
	saveHomesite(commLbId: number, homesiteDto: HomeSiteDtos.ILotDto, lotBuildTypeUpdated: boolean): Observable<HomeSiteDtos.ILotDto>
	{
		let dto = {
			id: homesiteDto.id,
			premium: homesiteDto.premium,
			lotStatusDescription: homesiteDto.lotStatusDescription.replace(' ', ''),
			foundationType: homesiteDto.foundationType,
			lotHandings: homesiteDto.lotHandings,
			facing: homesiteDto.facing,
			phdLotWarrantyId: homesiteDto.edhWarrantyType,
			alternateLotBlock: homesiteDto.altLotBlock,
			lotBuildTypeDesc: homesiteDto.lotBuildTypeDescription,
			view: {
				id: homesiteDto.view.id,
				description: homesiteDto.view.value
			},
			lotType: {
				id: homesiteDto.lotType.id,
				description: homesiteDto.lotType.value
			},
			lotBuildTypeUpdated: lotBuildTypeUpdated
		};

		let url = settings.apiUrl;

		url += `lots(${commLbId})`;

		return this._http.patch(url, dto).pipe(
			map(response =>
			{
				return homesiteDto;
			}), catchError(this.handleError));
	}

	getMonotonyRules(lotId: number): Observable<Array<MonotonyRule>>
	{
		let url = settings.apiUrl;

		const filter = `lotId eq ${lotId}`;

		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}`;

		url += `monotonyRules?${qryStr}`;

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				let returnVal = response.value.map(data =>
				{
					return {
						monotonyRuleId: data.monotonyRuleId,
						monotonyRuleType: data.monotonyRuleType,
						lotId: data.lotId,
						relatedLotId: data.relatedLotId
					} as MonotonyRule
				});

				return returnVal as Array<MonotonyRule>;
			}), catchError(this.handleError));
	}

	saveMonotonyRules(monotonyRules: Array<MonotonyRule>, lotId: number): Observable<Response>
	{
		const body = {
			"lotId": lotId,
			"monotonyRules": monotonyRules
		};

		const action = 'SaveMonotonyRules';
		const url = `${settings.apiUrl}${action}`;

		return this._http.post(url, body).pipe(
			map((response: Response) =>
			{
				return response;
			}),
			catchError(this.handleError)
		);
	}
	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);

		return _throw(error || 'Server error');
	}
}
