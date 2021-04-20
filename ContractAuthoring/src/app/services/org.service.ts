import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { ConnectableObservable, Subject, Observable, of } from 'rxjs';
import { catchError, tap, map, publishReplay, concat, take, filter, switchMap } from 'rxjs/operators';

import { SettingsService } from './settings.service';
import { StorageService } from './storage.service';

import { FinancialMarket } from '../models/financial-market.model';
import { Settings } from '../models/settings.model';
import { FinancialCommunity } from '../models/financial-community.model';
import { handleError } from '../utils/handle-error';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class OrgService {
    private _salesMarketsObs: ConnectableObservable<Array<FinancialMarket>>;
    private _finCommObs: ConnectableObservable<Array<FinancialCommunity>>;
    private _lastMktId: number;
    public salesMarkets: Observable<Array<FinancialMarket>>;
    private _ds: string = encodeURIComponent('$');

    get currentFinancialCommunityId(): number {
        return this._storageService.getLocal<number>('DT_CURRENT_FC');
    }

    set currentFinancialCommunityId(id: number) {
        this._storageService.setLocal('DT_CURRENT_FC', id);
    }

    private get currentSalesMarketId(): number {
        return this._storageService.getLocal<number>('DT_CURRENT_SM');
    }

    private set currentSalesMarketId(id: number) {
        this._storageService.setLocal('DT_CURRENT_SM', id);
    }

    private readonly _currentMarket = new Subject<FinancialMarket>();
    get currentMarket$(): Observable<FinancialMarket> {
        return this.salesMarkets.pipe(
            // provide an initial value by waiting for the market list to come back and returning the
            // one with the ID in local storage
            take(1),
            map(mkts => {
                const market = mkts.find(mkt => mkt.id === this.currentSalesMarketId);

                return market ? market : null;
            }),
            concat(this._currentMarket)
        );
    }

    selectMarket(market: FinancialMarket | number) {
        let mktId: number;

        if (typeof market === 'number') {
            mktId = market;
        } else {
            if (market) {
                mktId = market.id;
            } else {
                return;
            }
        }

        if (this.currentSalesMarketId !== mktId) {
            this.currentSalesMarketId = mktId;

            this.salesMarkets.pipe(
                take(1),
                map(mkts => mkts.find(mkt => mkt.id === mktId)),
                filter(mkt => mkt !== null),
                tap(mkt => {
                    // initialize selected community
                    this.getFinancialCommunities(mkt.id).subscribe(comms => {
                        const comm = comms.find(c => c.id === this.currentFinancialCommunityId);
                        this._currentComm.next(comm);
                    });
                })
            ).subscribe(mkt => this._currentMarket.next(mkt));
        }
    }

    private readonly _currentComm = new Subject<FinancialCommunity>();
    currentCommunity$: Observable<FinancialCommunity>;

    selectCommunity(community: FinancialCommunity | number) {
        let commId: number;

        if (typeof community === 'number') {
            commId = community;
        } else {
            if (community) {
                commId = community.id;
            } else {
                return;
            }
        }

        if (this.currentFinancialCommunityId !== commId) {
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
        private _storageService: StorageService
    ) {
        this._salesMarketsObs = this.getMarkets().pipe(
            publishReplay(1)
        ) as ConnectableObservable<Array<FinancialMarket>>;
        this._salesMarketsObs.connect();
        this.salesMarkets = this._salesMarketsObs;

        // initialize selected community
        this.currentMarket$.pipe(
            take(1),
            switchMap(mkt => {
                return mkt ? this.getFinancialCommunities(mkt.id) : of([]);
            })).subscribe(comms => {
                return this._currentComm.next(comms.find(comm => comm.id === this.currentFinancialCommunityId));
            });

        // do this to make sure new subscribers always get the most recently selected community
        this.currentCommunity$ = this._currentComm.pipe(
            publishReplay(1)
        );

        (<ConnectableObservable<FinancialCommunity>>this.currentCommunity$).connect();
    }

    public getMarkets(): Observable<Array<FinancialMarket>> {
        let url = settings.apiUrl;

        const filter = 'salesStatusDescription eq \'Active\' and companyType eq \'HB\'';
        const orderby = 'name';
        const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

        url += `assignedMarkets?${qryStr}`;

        return this._http.get(url).pipe(
            map((response: any) => {
                return response.value as Array<FinancialMarket>;
            }),
            catchError(handleError)
        );
    }

    getFinancialCommunities(marketId: number): Observable<Array<FinancialCommunity>> {
        if (!this._lastMktId || this._lastMktId !== marketId) {
            let url = settings.apiUrl;

            const filter = `marketId eq ${marketId}`;
            const select = 'id, marketId, name, number, salesStatusDescription, isPhasedPricingEnabled';
            const expand = 'market($select=id,number)';
            const orderBy = 'name';
            const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

            url += `financialCommunities?${qryStr}`;

            this._finCommObs = this._http.get(url).pipe(
                map((response: any) => {
                    return response.value.map(data => {
                        return {
                            id: data.id,
                            marketId: data.marketId,
                            name: data.name,
                            key: data.number,
                            marketKey: data.market.number,
                            salesStatusDescription: data.salesStatusDescription,
                            isPhasedPricingEnabled: data.isPhasedPricingEnabled
                        } as FinancialCommunity;
                    });
                }),
                catchError((err, src) => handleError(err)),
                publishReplay(1)
            ) as ConnectableObservable<Array<FinancialCommunity>>;

            this._finCommObs.connect();
            this._lastMktId = marketId;
        }

        return this._finCommObs;
    }
}
