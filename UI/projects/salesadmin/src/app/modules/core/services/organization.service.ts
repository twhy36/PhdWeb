
import { IReOrg } from './../../shared/models/re-org.model';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { ConnectableObservable, Subject, Observable ,  of ,  EMPTY as empty ,  throwError as _throw } from 'rxjs';
import { catchError, tap, map, publishReplay, concat, take, filter, switchMap, combineLatest } from 'rxjs/operators';

import { SettingsService } from './settings.service';
import { StorageService } from './storage.service';

import { FinancialMarket } from '../../shared/models/financialMarket.model';
import { Settings } from '../../shared/models/settings.model';
import { FinancialCommunity, FinancialCommunityInfo } from '../../shared/models/financialCommunity.model';
import { Org } from '../../shared/models/org.model';
import { IdentityService, ClaimTypes, Permission } from 'phd-common';
import * as _ from 'lodash';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class OrganizationService
{
	private _salesMarketsObs: ConnectableObservable<Array<FinancialMarket>>;
	private _finCommObs: ConnectableObservable<Array<FinancialCommunity>>;
	private _lastMktId: number;
	public salesMarkets: Observable<Array<FinancialMarket>>;
	private _internalOrgs$: ConnectableObservable<Array<Org>>;
	private _ds: string = encodeURIComponent('$');

	get currentFinancialCommunityId(): number
	{
		return this._storageService.getLocal<number>('DT_CURRENT_FC');
	}

	set currentFinancialCommunityId(id: number)
	{
		this._storageService.setLocal('DT_CURRENT_FC', id);
	}

	private get currentSalesMarketId(): number
	{
		return this._storageService.getLocal<number>('DT_CURRENT_SM');
	}

	private set currentSalesMarketId(id: number)
	{
		this._storageService.setLocal('DT_CURRENT_SM', id);
	}

	private readonly _currentMarket = new Subject<FinancialMarket>();
	get currentMarket$(): Observable<FinancialMarket>
	{
		return this.salesMarkets.pipe(
			// provide an initial value by waiting for the market list to come back and returning the
			// one with the ID in local storage
			take(1),
			switchMap(mkts =>
			{
				const market = mkts.find(mkt => mkt.id === this.currentSalesMarketId);

				return market ? of(market) : empty;
			}),
			concat(this._currentMarket)
		);
	}

	selectMarket(market: FinancialMarket | number)
	{
		let mktId: number;

		if (typeof market === 'number')
		{
			mktId = market;
		} else
		{
			if (market)
			{
				mktId = market.id;
			} else
			{
				return;
			}
		}

		if (this.currentSalesMarketId !== mktId)
		{
			this.currentSalesMarketId = mktId;

			this.salesMarkets.pipe(
				take(1),
				map(mkts => mkts.find(mkt => mkt.id === mktId)),
				filter(mkt => mkt !== null),
				tap(mkt =>
				{
					// initialize selected community
					this.getFinancialCommunities(mkt.id).subscribe(comms =>
					{
						const comm = comms.find(c => c.id === this.currentFinancialCommunityId);
						this._currentComm.next(comm);
					});
				})
			).subscribe(mkt => this._currentMarket.next(mkt));
		}
	}

	private readonly _currentComm = new Subject<FinancialCommunity>();
	currentCommunity$: Observable<FinancialCommunity>;

	selectCommunity(community: FinancialCommunity | number)
	{
		let commId: number;

		if (typeof community === 'number')
		{
			commId = community;
		} else
		{
			if (community)
			{
				commId = community.id;
			} else
			{
				return;
			}
		}

		if (this.currentFinancialCommunityId !== commId)
		{
			this.currentFinancialCommunityId = commId;

			this._finCommObs.pipe(
				take(1),
				map(comms => comms.find(comm => comm.id === commId)),
				filter(comm => comm !== null)
			).subscribe(comm => this._currentComm.next(comm));
		}
	}

	public canChangeOrg = false;

	constructor(
		private _http: HttpClient,
		private _storageService: StorageService,
		private _identityService: IdentityService
	)
	{
		this._salesMarketsObs = this.getMarkets().pipe(
			publishReplay(1)
		) as ConnectableObservable<Array<FinancialMarket>>;
		this._salesMarketsObs.connect();
		this.salesMarkets = this._salesMarketsObs;

		// initialize selected community
		this.currentMarket$.pipe(
			take(1),
			switchMap(mkt =>
			{
				return mkt ? this.getFinancialCommunities(mkt.id) : of([]);
			})).subscribe(comms =>
			{
				return this._currentComm.next(comms.find(comm => comm.id === this.currentFinancialCommunityId));
			});

		// do this to make sure new subscribers always get the most recently selected community
		this.currentCommunity$ = this._currentComm.pipe(
			publishReplay(1)
		);

		(<ConnectableObservable<FinancialCommunity>>this.currentCommunity$).connect();
	}

	private getMarkets(): Observable<Array<FinancialMarket>>
	{
		let url = settings.apiUrl;

		const filter = 'salesStatusDescription eq \'Active\' and companyType eq \'HB\'';
		const orderby = 'name';
		const qryStr = `${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}orderby=${encodeURIComponent(orderby)}`;

		url += `markets?${qryStr}`;

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				return response.value as Array<FinancialMarket>;
			})
		);
	}

	getFinancialCommunities(marketId: number): Observable<Array<FinancialCommunity>>
	{
		if (!this._lastMktId || this._lastMktId !== marketId)
		{
			let url = settings.apiUrl;

			const filter = `marketId eq ${marketId}`;
			const select = 'id, marketId, name, number, salesStatusDescription, isPhasedPricingEnabled, isElevationMonotonyRuleEnabled, isColorSchemeMonotonyRuleEnabled';
			const expand = 'market($select=id,number)';
			const orderBy = 'name';
			const qryStr = `${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}orderby=${encodeURIComponent(orderBy)}`;

			url += `financialCommunities?${qryStr}`;

			this._finCommObs = this._http.get(url).pipe(
				map((response: any) =>
				{
					return response.value.map(data =>
					{
						return {
							id: data.id,
							marketId: data.marketId,
							name: data.name,
							key: data.number,
							marketKey: data.market.number,
							salesStatusDescription: data.salesStatusDescription,
							isPhasedPricingEnabled: data.isPhasedPricingEnabled,
							isElevationMonotonyRuleEnabled: data.isElevationMonotonyRuleEnabled,
							isColorSchemeMonotonyRuleEnabled: data.isColorSchemeMonotonyRuleEnabled
						} as FinancialCommunity;
					});
				}),
				catchError((err, src) => this.handleError(err)),
				publishReplay(1)
			) as ConnectableObservable<Array<FinancialCommunity>>;

			this._finCommObs.connect();
			this._lastMktId = marketId;
		}

		return this._finCommObs;
	}

	isCommunity(org: any): org is FinancialCommunity
	{
		return org.salesStatusDescription !== undefined;
	}

	createInternalOrg(edhOrg: FinancialCommunity | FinancialMarket): Observable<any>
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
					org.integrationKey = edhOrg.key;
				}
				else
				{
					org.edhMarketId = edhOrg.id;
					org.integrationKey = edhOrg.number;
				}

				return this._http.post(url, org).pipe(
					map(response =>
					{
						return response;
					}))
			})
		)
	}

	getFinancialCommunity(id: number, includeMarket: boolean = false): Observable<FinancialCommunity>
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

		return this._http.get<any>(endpoint).pipe(
			map(response =>
			{
				const communities = response.value as Array<FinancialCommunity>;
				const community = communities && communities.length > 0 ? communities[0] : null;
				return community;
			}),
			catchError(this.handleError));
	}

	getFinancialCommunityInfo(id: number): Observable<FinancialCommunityInfo>
	{
		let url = settings.apiUrl;

		const filter = `financialCommunityId eq ${id}`;
		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}`;

		url += `financialCommunityInfos?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				return response.value.length > 0 ? new FinancialCommunityInfo(response.value[0]) : null;
			}));
	}

	saveFinancialCommunityInfo(financialCommunityInfo: FinancialCommunityInfo, orgId: number): Observable<FinancialCommunityInfo>
	{
		let url = settings.apiUrl;

		if (financialCommunityInfo.financialCommunityId > 0)
		{
			url += `financialCommunityInfos(${financialCommunityInfo.financialCommunityId})`;

			return this._http.patch(url, financialCommunityInfo).pipe(
				map((response: FinancialCommunityInfo) => {
					return response;
				}),
				catchError(this.handleError));
		}
		else
		{
			financialCommunityInfo.financialCommunityId = orgId;
			url += `financialCommunityInfos`;

			return this._http.post(url, financialCommunityInfo).pipe(
				map((response: FinancialCommunityInfo) => {
					return response;
				}),
				catchError(this.handleError));
		}
	}

	getInternalOrgs(marketId: number): Observable<Array<Org>>
	{
		let url = settings.apiUrl;

		const filter = `edhMarketId eq ${marketId}`;
		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}`;

		url += `orgs?${qryStr}`;

		this._internalOrgs$ = this._http.get(url).pipe(
			map(response =>
			{
				let orgs = response['value'] as Array<Org>;

				return orgs;
			}),
			catchError(this.handleError),
			publishReplay(1)
		) as ConnectableObservable<Array<Org>>;

		this._internalOrgs$.connect();

		return this._internalOrgs$;
	}

	getOrgs(reorgs: Array<IReOrg>): Observable<Array<IReOrg>>
	{
		let targetOrgs = reorgs.map(x => x.targetMarketId);
		let sourceOrgs = reorgs.map(x => x.sourceMarketId);
		let orgIds = [...new Set([...targetOrgs, ...sourceOrgs])];
		let url = settings.apiUrl;
		const filter = `OrgId in (${orgIds.join(',')})`;
		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}`;

		url += `orgs?${qryStr}`;
		return this._http.get(url).pipe(
			map(response =>
			{
				let orgs = response['value'] as Array<Org>;
				reorgs.map(reorg =>
				{
					reorg.sourceMarketId = orgs.find(org => org.orgID === reorg.sourceMarketId).edhMarketId;
					reorg.targetMarketId = orgs.find(org => org.orgID === reorg.targetMarketId).edhMarketId;
				})

				return reorgs;
			}));
	}


	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure //
		console.error(error);

		return _throw(error || 'Server error');
	}

	canEdit(claimType: ClaimTypes): Observable<boolean>
	{
		return this.currentMarket$.pipe(
			switchMap(mkt => this._identityService.hasClaimWithPermission(claimType, Permission.Edit).pipe(
				combineLatest(this._identityService.hasMarket(mkt.number))
			)),
			map(([hasClaim, hasMkt]) => hasClaim && hasMkt)
		);
	}
}
