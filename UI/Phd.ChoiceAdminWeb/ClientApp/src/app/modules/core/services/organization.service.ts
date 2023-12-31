import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, Subject, ConnectableObservable, ReplaySubject, of, throwError as _throw } from 'rxjs';
import { combineLatest, map, catchError, publishReplay, switchMap } from 'rxjs/operators';

import { IFinancialCommunity } from '../../shared/models/financial-community.model';
import { IFinancialMarket } from '../../shared/models/financial-market.model';
import { Settings } from '../../shared/models/settings.model';

import { LoggingService } from './logging.service';
import { SettingsService } from './settings.service';
import { StorageService } from './storage.service';
import { PhdEntityDto } from '../../shared/models/api-dtos.model';
import { withSpinner } from 'phd-common/extensions/withSpinner.extension';
import { IPlanOptionResult } from '../../shared/models/plan.model';

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

	get currentFinancialCommunity(): string
	{
		return this._storageService.getLocal<string>('CA_CURRENT_FC');
	}

	set currentFinancialCommunity(val: string)
	{
		this._storageService.setLocal('CA_CURRENT_FC', val);
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

	getFinancialMarkets(): Observable<Array<IFinancialMarket>>
	{
		return this._financialMarkets$;
	}

	getCommunities(marketId: number): Observable<Array<IFinancialCommunity>>
	{
		const filter = `marketId eq ${marketId} and (salesStatusDescription eq 'Active' or salesStatusDescription eq 'New')`;
		const select = `id,number,name,salesCommunityId,salesStatusDescription,marketId`;
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
	 * Returns a list of financialCommunities and plans from the given plan list.
	 * Used on Div Wizard and Option Wizard
	 * @param marketId
	 * @param plans
	 */
	getCommunitiesWithPlans(marketId: number, plans: PhdEntityDto.IPlanDto[]): Observable<Array<IFinancialCommunity>>
	{
		const batchGuid = odataUtils.getNewGuid();

		let requests = plans.map(p =>
		{
			const entity = `financialCommunities`;
			const expand = `planCommunities($filter=financialPlanIntegrationKey eq '${p.integrationKey}' and productType ne 'MultiUnit Shell';$select=id, financialPlanIntegrationKey, planSalesName; $orderby=planSalesName)`
			const select = `id,number,name,salesCommunityId,salesStatusDescription,marketId`;
			const filter = `id eq ${p.org.edhFinancialCommunityId} and marketId eq ${marketId} and (salesStatusDescription eq 'Active' or salesStatusDescription eq 'New') and planCommunities/any(pc: pc/financialPlanIntegrationKey eq '${p.integrationKey}' and pc/isActive eq true and pc/productType ne 'MultiUnit Shell')`;
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

	getAssignedMarkets(): Observable<Array<IFinancialMarket>>
	{
		const filter = `financialCommunities/any() and companyType eq 'HB' and salesStatusDescription eq 'Active'`;
		const expand = `financialCommunities($top = 1; $select = salesStatusDescription, id; $filter = salesStatusDescription eq 'Active')`;
		return withSpinner(this._http).get<any>(`${settings.apiUrl}assignedMarkets?${this._ds}select=id,number,name&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}`).pipe(
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
