import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable ,  ReplaySubject,  throwError as _throw } from 'rxjs';
import { combineLatest, catchError, map } from 'rxjs/operators';

import * as odataUtils from '../../shared/utils/odata.util';

import { Settings } from '../../shared/models/settings.model';
import { communityLot, HomeSiteDtos } from '../../shared/models/homesite.model';
import { LotChoiceRuleAssoc, withSpinner } from 'phd-common';

import { SettingsService } from './settings.service';
import { MonotonyRule } from '../../shared/models/monotonyRule.model';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class HomeSiteService
{
	constructor(
		private _http: HttpClient
	) { }

	private _communityLots = new ReplaySubject<Array<communityLot>>(1);

	getCommunityLots(): Observable<Array<communityLot>>
	{
		return this._communityLots;
	}

	/**
	* Gets the homesites for the specified financial community
	* @param communityId {number} the community
	*/
	getCommunityHomeSites(communityId: number, topRows?: number, skipRows?: number, keywords?: string, statusFilter?: string[], handingFilter?: string[]): Observable<Array<HomeSiteDtos.ILotDto>>
	{
		let url = settings.apiUrl;

		const expand = `jobs($select=id,jobTypeName),planAssociations($select=id,isActive;$expand=planCommunity($select=id, financialPlanIntegrationKey)), salesPhase($select=id, salesPhaseName), financialCommunity($select=id, number, marketId; $expand=market($select=id, number)), lotHandingAssocs($expand=handing($select=id,name)), lotViewAdjacencyAssocs($expand=viewAdjacency), lotPhysicalLotTypeAssocs($expand=physicalLotType)`;
		let filter = ``;

		if (keywords)
		{
			let filters = [];
			let filterName = 'lotBlock';

			const keywordArray = keywords.toLowerCase().split(' ');

			keywordArray.map(keyword => {
				filters.push(`indexof(tolower(${filterName}), '${keyword}') gt -1`);
			});

			const keysfilter = filters.join(' or ');

			filter += `(${keysfilter}) and `;
		}

		if (statusFilter && statusFilter.length)
		{
			let filters = [];
			let filterName = 'lotStatusDescription';

			statusFilter.map(status =>
			{
				if (status === 'Spec Unavailable')
				{
					filters.push(`${filterName} eq 'Unavailable' and lotBuildTypeDesc eq 'Spec' and jobs/any(j: j/jobTypeName ne 'Model')`);
				}
				else if (status === 'Spec')
				{
					filters.push(`lotBuildTypeDesc eq '${status}' and jobs/any(j: j/jobTypeName ne 'Model')`);
				}
				else if (status === 'Model')
				{
					filters.push(`(lotBuildTypeDesc eq '${status}' or lotBuildTypeDesc eq 'Spec') and jobs/any(j: j/jobTypeName eq '${status}')`);
				}
				else if (status === 'Pending Release')
				{
					filters.push(`${filterName} eq 'PendingRelease'`);
				}
				else if (status === 'Pending Sale')
				{
					filters.push(`${filterName} eq 'PendingSale'`);
				}
				else
				{
					filters.push(`${filterName} eq '${status}'`);
				}
			});

			const keyStatusFilter = filters.join(' or ');

			filter += `(${keyStatusFilter}) and `;
		}

		if (handingFilter && handingFilter.length)
		{
			let filters = [];

			handingFilter.map(handing =>
			{
				filters.push(`lotHandingAssocs/any(h: h/handing/name eq '${handing}')`);
			});

			const keyHandingFilter = filters.join(' or ');

			filter += `(${keyHandingFilter}) and `;
		}

		filter += `financialCommunity/id eq ${communityId} and lotStatusDescription ne 'Deleted' and isMasterUnit eq false`;
		const orderBy = 'lotBlock';

		const qryStr = `${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}orderBy=${encodeURIComponent(orderBy)}`;

		url += `lots?${qryStr}`;

		if (topRows)
		{
			url += `&${encodeURIComponent("$")}top=${topRows}`;
		}

		if (skipRows)
		{
			url += `&${encodeURIComponent("$")}skip=${skipRows}`;
		}

		return (skipRows ? this._http : withSpinner(this._http)).get(url).pipe(
			combineLatest(this.getViewAdjacencies(), this.getPhysicalLotTypes()),
			map(([response, viewAdjacencies, lotTypes]: [any, HomeSiteDtos.ILabel[], HomeSiteDtos.ILabel[]]) =>
			{
				let retVal = response.value.map(data =>
				{
					let lotDto = this.mapLotDto(data, viewAdjacencies, lotTypes);

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
			combineLatest(this.getViewAdjacencies(), this.getPhysicalLotTypes()),
			map(([response, viewAdjacencies, lotTypes]: [any, HomeSiteDtos.ILabel[], HomeSiteDtos.ILabel[]]) =>
			{
				let retVal = response.value.map(data =>
				{
					return this.mapLotDto(data, viewAdjacencies, lotTypes);
				});

				return retVal as Array<HomeSiteDtos.ILotDto>;
			}),
			catchError(this.handleError));
	}

	mapLotDto(data: any, viewAdjacencies: HomeSiteDtos.ILabel[], lotTypes: HomeSiteDtos.ILabel[]): HomeSiteDtos.ILotDto
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
				viewAdjacencies.find(item => item.label === data.lotViewAdjacencyAssocs[0].viewAdjacency.description) as HomeSiteDtos.ILabel || '',
			lotType: data.lotPhysicalLotTypeAssocs &&
				data.lotPhysicalLotTypeAssocs[0] &&
				lotTypes.find(item => item.label === data.lotPhysicalLotTypeAssocs[0].physicalLotType.description) as HomeSiteDtos.ILabel || '',
			isMasterUnit: data.isMasterUnit,
			isHiddenInTho: data.isHiddenInTho,
			job: data.jobs && data.jobs[0] ? data.jobs[0] : null
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
				description: homesiteDto.view.label
			},
			lotType: {
				id: homesiteDto.lotType.id,
				description: homesiteDto.lotType.label
			},
			lotBuildTypeUpdated: lotBuildTypeUpdated,
			isHiddenInTho: homesiteDto.isHiddenInTho
		};

		let url = settings.apiUrl;

		url += `lots(${commLbId})`;

		return this._http.patch(url, dto).pipe(
			map(response =>
			{
				return homesiteDto;
			}), catchError(this.handleError));
	}

	deleteLotChoiceRuleAssoc(dtos: LotChoiceRuleAssoc[]): Observable<boolean>
	{
		const lotChoiceRulesToBeDeleted = dtos.map(t => ({ lotChoiceRuleAssocId: t.lotChoiceRuleAssocId } as LotChoiceRuleAssoc));

		const endPoint = `${settings.apiUrl}$batch`;
		const batchRequests = odataUtils.createBatchDelete<LotChoiceRuleAssoc>(lotChoiceRulesToBeDeleted, 'lotChoiceRuleAssocId', 'lotChoiceRuleAssocs');
		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return true;
			}), catchError(this.handleError));
	}

	getLotChoiceRuleAssocs(marketId: number): Observable<Array<LotChoiceRuleAssoc>>
	{
		let url = settings.apiUrl;
		const filter = `DivChoiceCatalog/DivDPointCatalog/Org/EdhMarketId eq ${marketId}`;
		const select = `lotChoiceRuleAssocId, edhLotId, planId, divChoiceCatalogId, mustHave`;
		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;
		url += `lotChoiceRuleAssocs?${qryStr}`;

		return withSpinner(this._http).get(url).pipe(
			map((response: any) =>
			{
				return response.value as Array<LotChoiceRuleAssoc>;
			}), catchError(this.handleError));
	}

	saveLotChoiceRuleAssoc(assoc: LotChoiceRuleAssoc): Observable<LotChoiceRuleAssoc>
	{
		let url = settings.apiUrl;

		if (assoc.lotChoiceRuleAssocId)
		{
			url += `lotChoiceRuleAssocs(${assoc.lotChoiceRuleAssocId})`;

			return this._http.patch(url, assoc).pipe(
				map((response: LotChoiceRuleAssoc) =>
				{
					return {
						lotChoiceRuleAssocId: response.lotChoiceRuleAssocId,
						edhLotId: response.edhLotId,
						planId: response.planId,
						divChoiceCatalogId: response.divChoiceCatalogId,
						mustHave: response.mustHave
					} as LotChoiceRuleAssoc;
				}),
				catchError(this.handleError));
		}
		else
		{
			url += 'lotChoiceRuleAssocs';

			return this._http.post(url, assoc).pipe(
				map((response: LotChoiceRuleAssoc) =>
				{
					return {
						lotChoiceRuleAssocId: response.lotChoiceRuleAssocId,
						edhLotId: response.edhLotId,
						planId: response.planId,
						divChoiceCatalogId: response.divChoiceCatalogId,
						mustHave: response.mustHave
					} as LotChoiceRuleAssoc;
				}),
				catchError(this.handleError));
		}
	}

	getMonotonyRules(lotId: number): Observable<Array<MonotonyRule>>
	{
		let url = settings.apiUrl;

		const filter = `lotId eq ${lotId} and isActive eq true`;

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

	getViewAdjacencies() : Observable<Array<HomeSiteDtos.ILabel>>
	{
		let url = settings.apiUrl + 'viewAdjacencies';

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				return response.value.map(data =>
					{
						return {
							id: data.id,
							label: data.description,
							value: data.id as string
						} as HomeSiteDtos.ILabel;
					});
			}), catchError(this.handleError));		
	}

	getPhysicalLotTypes() : Observable<Array<HomeSiteDtos.ILabel>>
	{
		let url = settings.apiUrl + 'physicalLotTypes';

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				return response.value.map(data =>
					{
						return {
							id: data.id,
							label: data.description,
							value: data.id as string
						} as HomeSiteDtos.ILabel;
					});
			}), catchError(this.handleError));		
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);

		return _throw(error || 'Server error');
	}

	loadCommunityLots(commId: number)
	{
			let url = settings.apiUrl;
			let filter = `financialCommunity/id eq ${commId} and lotStatusDescription ne 'Deleted' and isMasterUnit eq false`;
			const select = `id, lotBlock`;
			const orderBy = 'lotBlock';

			const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}&${encodeURIComponent("$")}orderBy=${encodeURIComponent(orderBy)}`;

			url += `lots?${qryStr}`;

			return this._http.get(url).subscribe( (response: any) => {
					this._communityLots.next(response.value);
				}), catchError(this.handleError);
		
	}
}
