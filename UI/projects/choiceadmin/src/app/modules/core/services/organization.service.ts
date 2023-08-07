import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, Subject, ConnectableObservable, ReplaySubject, of, throwError as _throw } from 'rxjs';
import { combineLatest, map, catchError, publishReplay, switchMap } from 'rxjs/operators';

import { IFinancialCommunity } from '../../shared/models/financial-community.model';
import { IFinancialMarket } from '../../shared/models/financial-market.model';
import { Settings } from '../../shared/models/settings.model';

import { SettingsService } from './settings.service';
import { StorageService } from './storage.service';
import { PhdEntityDto } from '../../shared/models/api-dtos.model';
import { LoggingService, withSpinner } from 'phd-common';
import * as _ from 'lodash';

import * as odataUtils from '../../shared/classes/odata-utils.class';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class OrganizationService
{
	private _ds: string = encodeURIComponent('$');
	private _internalOrgs$: ConnectableObservable<Array<PhdEntityDto.IOrgDto>>;
	private _financialMarkets$: ConnectableObservable<Array<IFinancialMarket>>;

	currentFinancialMarket$: Subject<string>;

	get currentFinancialMarket(): string
	{
		return this._storageService.getLocal<string>('CA_CURRENT_FM');
	}

	set currentFinancialMarket(val: string)
	{
		this.currentFinancialMarket$.next(val);

		this._storageService.setLocal('CA_CURRENT_FM', val);
	}

	get currentFinancialCommunity(): IFinancialCommunity
	{
		return this._storageService.getLocal<IFinancialCommunity>('CA_CURRENT_FC');
	}

	set currentFinancialCommunity(val: IFinancialCommunity)
	{
		this._storageService.setLocal('CA_CURRENT_FC', { id: val.id, number: val.number });
	}

	constructor(private _http: HttpClient, private _loggingService: LoggingService, private _storageService: StorageService)
	{
		this.currentFinancialMarket$ = new ReplaySubject<string>(1);

		const currFinancialMarket = this._storageService.getLocal<string>('CA_CURRENT_FM');
		this.currentFinancialMarket$.next(currFinancialMarket);

		let url = settings.apiUrl;

		const filter = `edhMarketId ne null and edhFinancialCommunityId eq null`;
		const select = `orgID, edhMarketId, edhFinancialCommunityId`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `orgs?${qryStr}`;

		this._internalOrgs$ = withSpinner(this._http).get(url).pipe(
			map(response =>
			{
				let orgs = response['value'] as PhdEntityDto.IOrgDto;

				return orgs;
			}),
			catchError(this.handleError),
			publishReplay(1)
		) as ConnectableObservable<Array<any>>;
		this._internalOrgs$.connect();


		let endPoint = settings.apiUrl;

		const expandOnMarkets = `financialCommunities($top=1;$select=salesStatusDescription,id;$filter=salesStatusDescription eq 'Active')`;
		const filterOnMarkets = `financialCommunities/any() and companyType eq 'HB' and salesStatusDescription eq 'Active'`;
		const selectOnMarkets = `id, number, name, companyType, salesStatusDescription`;
		const orderByOnMarkets = `name`;

		const qryStrOnMarkets = `${this._ds}expand=${encodeURIComponent(expandOnMarkets)}&${this._ds}filter=${encodeURIComponent(filterOnMarkets)}&${this._ds}select=${encodeURIComponent(selectOnMarkets)}&${this._ds}orderby=${encodeURIComponent(orderByOnMarkets)}`;

		endPoint += `markets?${qryStrOnMarkets}`;

		this._financialMarkets$ = this._http.get(endPoint).pipe(
			map(response =>
			{
				let markets = response['value'] as Array<IFinancialMarket>;

				return markets;
			}),
			catchError(this.handleError),
			publishReplay(1)
		) as ConnectableObservable<Array<IFinancialMarket>>;
		this._financialMarkets$.connect();
	}

	getInternalOrgs(): Observable<Array<PhdEntityDto.IOrgDto>>
	{
		return this._internalOrgs$;
	}

	isCommunity(org: any): org is IFinancialCommunity
	{
		return org.financialCommunityId !== undefined;
	}

	createInternalOrg(edhOrg: IFinancialMarket | IFinancialCommunity): Observable<PhdEntityDto.IOrgDto>
	{
		let obs = this.isCommunity(edhOrg) ? this.getFinancialCommunity(edhOrg.id, true).pipe(map(comm => comm.market)) : of(edhOrg);

		return obs.pipe(
			switchMap(mkt =>
			{
				let url = settings.apiUrl;

				url += `orgs`;

				let org: { edhMarketId: number, edhFinancialCommunityId: number, integrationKey: string } = <any>{};

				if (this.isCommunity(edhOrg))
				{
					org.edhFinancialCommunityId = edhOrg.id;
					org.edhMarketId = mkt.id;
				}
				else
				{
					org.edhMarketId = edhOrg.id;
				}

				org.integrationKey = edhOrg.number;

				return this._http.post(url, org).pipe(
					map(response =>
					{
						return response as PhdEntityDto.IOrgDto;
					}));
			})
		)
	}

	getFinancialCommunity(id: number, includeMarket: boolean = false): Observable<IFinancialCommunity>
	{
		const entity = `financialCommunities`;
		const expand = `market($select = id, number, name)`;
		const filter = `id eq ${id}`;
		const select = `id, number, name`;

		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		if (includeMarket)
		{
			qryStr += `&${this._ds}expand=${encodeURIComponent(expand)}`;
		}

		const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(endpoint).pipe(
			map(response =>
			{
				const communities = response.value as Array<IFinancialCommunity>;
				const community = communities && communities.length > 0 ? communities[0] : null;

				return community;
			}),
			catchError(this.handleError));
	}

	getFinancialCommunitiesByIds(ids: number[]): Observable<IFinancialCommunity[]>
	{
		let url = settings.apiUrl;

		const filter = `id in (${ids.map(r => r).join(',')})`;
		const select = `id, number, name`;
		const orderby = `name`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `financialCommunities?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let communities = response['value'] as IFinancialCommunity[];

				return communities;
			}),
			catchError(this.handleError));
	}

	getFinancialMarkets(): Observable<Array<IFinancialMarket>>
	{
		return this._financialMarkets$;
	}

	getCommunities(marketId: number): Observable<Array<IFinancialCommunity>>
	{
		const filter = `marketId eq ${marketId} and (salesStatusDescription eq 'Active' or salesStatusDescription eq 'New')`;
		const select = `id,number,name,salesCommunityId,salesStatusDescription,marketId,financialBrandId`;
		const orderBy = `name`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;
		let url = `${settings.apiUrl}financialCommunities?${qryStr}`;

		return withSpinner(this._http).get(url).pipe(
			map(response =>
			{
				return response['value'] as Array<IFinancialCommunity>;
			})
		);
	}

	/**
	 * Gets all communities that include at least one plan with a specific choice.
	 * @param marketId The community's market.
	 * @param divChoiceCatalogId The ID of the choice.
	 */
	getCommunitiesWithChoice(marketId: number, divChoiceCatalogId: number): Observable<IFinancialCommunity[]>
	{
		const filter = `marketId eq ${marketId} and (salesStatusDescription eq 'Active' or salesStatusDescription eq 'New')`;
		const select = `id,number,name,salesCommunityId,salesStatusDescription,marketId`;
		const orderBy = `name`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;
		const url = `${settings.apiUrl}GetCommunitiesForDivCatalogChoice?${qryStr}`;

		const body = {
			marketId: marketId,
			divChoiceCatalogId: divChoiceCatalogId
		};

		return withSpinner(this._http).post(url, body).pipe(
			map(response =>
			{
				const communities = response['value'] as IFinancialCommunity[];
				
				return communities;
			})
		);
	}

	getOrgsForCommunities(marketId: number, financialCommunityIds: number[]): Observable<Array<PhdEntityDto.IOrgCommunityDto>>
	{
		const url = `${settings.apiUrl}getOrgsForFinancialCommunities`;

		const body = {
			marketId: marketId,
			financialCommunityIds: financialCommunityIds
		};

		return withSpinner(this._http).post(url, body).pipe(
			map(response => {
				return response['value'] as Array<PhdEntityDto.IOrgCommunityDto>;
			}));
	}

	/**
	 * Returns a list of financialCommunities and plans from the given plan list.
	 * Used on Div Wizard and Option Wizard
	 * @param marketId
	 * @param plans
	 */
	getCommunitiesWithPlans(marketId: number, plans: PhdEntityDto.IPlanDto[]): Observable<Array<IFinancialCommunity>>
	{
		const batchGuid = odataUtils.getNewGuid();

		const planGroups = _.groupBy(plans, 'org.edhFinancialCommunityId');
		let requests = Object.keys(planGroups).map(communityID =>
		{
			var financialPlanIntegrationKey = planGroups[communityID].map(x => `'${(x as PhdEntityDto.IPlanDto).integrationKey}'`).join(',');

			const entity = `financialCommunities`;
			const expand = `planCommunities($filter=financialPlanIntegrationKey in (${financialPlanIntegrationKey}) and productType ne 'MultiUnit Shell' and isActive eq true;$select=id, financialPlanIntegrationKey, planSalesName; $orderby=planSalesName)`
			const select = `id,number,name,salesCommunityId,salesStatusDescription,marketId`;
			const filter = `id eq ${communityID} and marketId eq ${marketId} and (salesStatusDescription eq 'Active' or salesStatusDescription eq 'New') and planCommunities/any(pc: pc/financialPlanIntegrationKey in (${financialPlanIntegrationKey}) and pc/isActive eq true and pc/productType ne 'MultiUnit Shell')`;
			const orderBy = `name`;

			const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}orderby=${encodeURIComponent(orderBy)}&${this._ds}count=true`;

			const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

			return odataUtils.createBatchGet(endpoint);
		});

		let headers = odataUtils.createBatchHeaders(batchGuid);
		let batch = odataUtils.createBatchBody(batchGuid, requests);

		var result: IFinancialCommunity[] = [];

		return withSpinner(this._http).post(`${settings.apiUrl}$batch`, batch, { headers: headers }).pipe(
			map((response: any) =>
			{
				let bodies = response.responses.map(r => r.body);

				bodies.forEach(body =>
				{
					let value = body.value.length > 0 ? body.value[0] : null;

					if (value)
					{
						let found = result.findIndex(res => res.id === value.id);

						found > -1 ? result[found].planCommunities.push(value.planCommunities[0]) : result.push(value);
					}
				});

				result.map(fc =>
				{
					// sort plans
					return fc.planCommunities.sort((a, b) =>
					{
						let aName = a.planSalesName.toLowerCase();
						let bName = b.planSalesName.toLowerCase();

						if (aName < bName)
						{
							return -1;
						}

						if (aName > bName)
						{
							return 1;
						}

						return 0;
					});
				});

				// return a sorted list of communities
				return result.sort((a, b) =>
				{
					let aName = a.name.toLowerCase();
					let bName = b.name.toLowerCase();

					if (aName < bName)
					{
						return -1;
					}

					if (aName > bName)
					{
						return 1;
					}

					return 0;
				});;
			})
		);
	}

	getMarkets(): Observable<Array<IFinancialMarket>>
	{
		let retMarkets = this.getFinancialMarkets().
			pipe(
				combineLatest(this.getInternalOrgs()),
				map(([markets, orgs]: [IFinancialMarket[], PhdEntityDto.IOrgDto[]]) =>
				{
					let marketList = markets.map(m =>
					{
						let market = {
							id: m.id,
							name: m.name,
							number: m.number,
							orgId: (orgs.find(x => x.edhMarketId === m.id) || {}).orgID
						};

						return market;
					});

					return marketList;
				})
			);

		return retMarkets;
	}

	getOrgByKey(integrationKey: string, isMarket: boolean)
	{
		const select = `orgID, edhMarketId, edhFinancialCommunityId`;
		let filter = `integrationKey eq '${integrationKey}' and edhFinancialCommunityId ${isMarket ? 'eq' : 'ne'} null`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		let url = `${settings.apiUrl}orgs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				return response['value'][0] as PhdEntityDto.IOrgDto;
			})
		);
	}

	getAssignedMarkets(): Observable<Array<IFinancialMarket>>
	{
		const filter = `financialCommunities/any() and companyType eq 'HB' and salesStatusDescription eq 'Active'`;
		const expand = `financialCommunities($top = 1; $select = salesStatusDescription, id; $filter = salesStatusDescription eq 'Active')`;
		const orderBy = `name`;

		return withSpinner(this._http).get<any>(`${settings.apiUrl}assignedMarkets?${this._ds}select=id,number,name&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`).pipe(
			map((response: any) => response.value.map(mkt => <{ id: number, number: string }>mkt))
		);
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}
