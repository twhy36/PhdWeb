import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, Subject, ConnectableObservable, EMPTY, ReplaySubject, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, publishReplay, take, switchMap, concat, filter, tap } from 'rxjs/operators';

import { StorageService } from './storage.service';

import { environment } from '../../../../environments/environment';
import { IMarket, IPlan, IFinancialCommunity } from '../../shared/models/community.model';

@Injectable()
export class OrganizationService
{
	private _ds: string = encodeURIComponent('$');
	private _markets$: ConnectableObservable<Array<IMarket>>;
	private _comms$: ReplaySubject<IFinancialCommunity[]> = new ReplaySubject<IFinancialCommunity[]>(1);
	private _lastMktId: number;

	get markets$(): Observable<IMarket[]>{
		return this._markets$;
	}

	private readonly _currentMarket = new Subject<IMarket>();
	get currentMarket$(): Observable<IMarket>
	{
		return this.markets$.pipe(
			// provide an initial value by waiting for the market list to come back and returning the
			// one with the ID in local storage
			take(1),
			switchMap(mkts =>
			{
				const market = mkts.find(mkt => mkt.id === this.currentMarketId);

				return market ? of(market) : EMPTY;
			}),
			concat(this._currentMarket)
		);
	}

	// BehaviorSubject to allow each subscriber to get last community
	private readonly _currentComm = new BehaviorSubject<IFinancialCommunity>(null);
	currentCommunity$: Observable<IFinancialCommunity>;

	private get currentMarketId(): number
	{
		return this._storageService.getLocal<number>('DT_CURRENT_SM');
	}

	private set currentMarketId(id: number)
	{
		this._storageService.setLocal('DT_CURRENT_SM', id);
	}

	private get currentFinancialCommunityId(): number
	{
		return this._storageService.getLocal<number>('DT_CURRENT_FC');
	}

	private set currentFinancialCommunityId(id: number)
	{
		this._storageService.setLocal('DT_CURRENT_FC', id);
	}

	constructor(private _http: HttpClient, private _storageService: StorageService)
	{
		this._markets$ = this.getMarkets().pipe(
			publishReplay(1)
		) as ConnectableObservable<Array<IMarket>>;
		this._markets$.connect();

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
		this.currentCommunity$ = this._currentComm;
	}

	selectMarket(market: IMarket | number)
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

		if (this.currentMarketId !== mktId)
		{
			this.currentMarketId = mktId;

			this.markets$.pipe(
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

	selectCommunity(community: IFinancialCommunity | number)
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

			this._comms$.pipe(
				take(1),
				map(comms => comms.find(comm => comm.id === commId)),
				filter(comm => comm !== null)
			).subscribe(comm => this._currentComm.next(comm));
		}
	}

	private getMarkets(): Observable<Array<IMarket>>{
		// Get markets
		let endPoint = environment.apiUrl;

		const expandOnMarkets = `financialCommunities($top=1;$select=salesStatusDescription,id;$filter=salesStatusDescription eq 'Active')`;
		const filterOnMarkets = `financialCommunities/any() and companyType eq 'HB' and salesStatusDescription eq 'Active'`;
		const selectOnMarkets = `id, number, name, companyType, salesStatusDescription`;
		const orderByOnMarkets = `name`;

		const qryStrOnMarkets = `${this._ds}expand=${encodeURIComponent(expandOnMarkets)}&${this._ds}filter=${encodeURIComponent(filterOnMarkets)}&${this._ds}select=${encodeURIComponent(selectOnMarkets)}&${this._ds}orderby=${encodeURIComponent(orderByOnMarkets)}`;

		endPoint += `assignedMarkets?${qryStrOnMarkets}`;

		return this._http.get<any>(endPoint).pipe(
			map(response =>
          	{
            	let markets = response['value'] as Array<IMarket>;
				return markets;
			}),
			catchError(this.handleError)
		);
	}

	getMarket(edhFinancialCommunityId: number): Observable<IMarket>{
		// Get's a specific market based on it's edhFinancialCommunityId, regardless of salesStatusDescription being active or not
		const expandOnMarkets = `financialCommunities($select=salesStatusDescription,id,name;$filter=id eq ${edhFinancialCommunityId})`;
		const filterOnMarkets = `financialCommunities/any(fc: fc/id eq ${edhFinancialCommunityId})`;
		const selectOnMarkets = `id, number, name, companyType, salesStatusDescription, financialCommunities`;
		const orderByOnMarkets = `name`;
		
		const qryStrOnMarkets = `${this._ds}expand=${encodeURIComponent(expandOnMarkets)}&${this._ds}filter=${encodeURIComponent(filterOnMarkets)}
								&${this._ds}select=${encodeURIComponent(selectOnMarkets)}&${this._ds}orderby=${encodeURIComponent(orderByOnMarkets)}`;
		
		let endPoint = environment.apiUrl+`assignedMarkets?${qryStrOnMarkets}`;

		return this._http.get<any>(`${endPoint}`).pipe(
			map((response) => {
				return response.value[0] as IMarket;
			}),
			catchError(this.handleError)
		);
	}

	getFinancialCommunities(marketId: number): Observable<Array<IFinancialCommunity>>
	{
		if (!this._lastMktId || this._lastMktId !== marketId)
		{
			let url = environment.apiUrl;

			const filter = `marketId eq ${marketId}`;
			const select = 'id, marketId, name, number, salesStatusDescription';
			const expand = 'market($select=id,number)';
			const orderBy = 'name';
			const qryStr = `${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}orderby=${encodeURIComponent(orderBy)}`;

			url += `financialCommunities?${qryStr}`;

			this._lastMktId = marketId;

			return this._http.get(url).pipe(
				map((response: any) =>
				{
					return response.value.map(data =>
					{
						return {
							id: data.id,
							name: data.name,
							number: data.number,
							salesStatusDescription: data.salesStatusDescription
						} as IFinancialCommunity;
					});
				}),
				tap(comm => this._comms$.next(comm)),
				catchError((err, src) => this.handleError(err)),
			);
		}

		return this._comms$;
	}

	getPlans(commId: number): Observable<Array<IPlan>>
	{
		const entity = 'planCommunities';
		const filter = `financialCommunityId eq ${commId}`;
		const select = `id, planSalesName, financialPlanIntegrationKey`;
		const orderBy = `planSalesName`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		let url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response => {
				let plans = response.value.map(plan => {
					return {
						id: plan.id,
						planName: plan.planSalesName,
						financialPlanIntegrationKey: plan.financialPlanIntegrationKey
					};
				}) as Array<IPlan>;

				return plans;
			}),
			catchError(this.handleError));
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error('Error message: ', error);

		return throwError(error || 'Server error');
	}
}
