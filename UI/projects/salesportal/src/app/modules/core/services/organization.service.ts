import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, Subject, ConnectableObservable, of, throwError } from 'rxjs';
import { map, catchError, publishReplay } from 'rxjs/operators';

import { StorageService } from './storage.service';

import { environment } from '../../../../environments/environment';
import { IMarket, ISalesCommunity, IPlan, ITreeVersion, ISalesCommunityWebSiteCommunityAssoc, IWebSiteCommunity } from '../../shared/models/community.model';

@Injectable()
export class OrganizationService
{
  private _ds: string = encodeURIComponent('$');
  private _financialMarkets$: ConnectableObservable<Array<IMarket>>;

  // Used for storing communities per market by ID
  marketCommunities = {};

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

	get currentSalesCommunity(): string
	{
		return this._storageService.getLocal<string>('CA_CURRENT_SC');
	}

	set currentSalesCommunity(val: string)
	{
		this._storageService.setLocal('CA_CURRENT_SC', val);
	}

	get currentPlan(): number
	{
		return this._storageService.getLocal<number>('CA_CURRENT_PLAN');
	}

	set currentPlan(val: number)
	{
		this._storageService.setLocal('CA_CURRENT_PLAN', val);
	}

	get currentTreeVersion(): number
	{
		return this._storageService.getLocal<number>('CA_CURRENT_TV');
	}

	set currentTreeVersion(val: number)
	{
		this._storageService.setLocal('CA_CURRENT_TV', val);
	}

	constructor(private _http: HttpClient, private _storageService: StorageService)
	{
		this.currentFinancialMarket$ = new Subject<string>();

    // Get market if saved locally
		const currFinancialMarket = this._storageService.getLocal<string>('CA_CURRENT_FM');
		this.currentFinancialMarket$.next(currFinancialMarket);

    // Get markets
    let endPoint = environment.apiUrl;

		const expandOnMarkets = `financialCommunities($top=1;$select=salesStatusDescription,id;$filter=salesStatusDescription eq 'Active')`;
		const filterOnMarkets = `financialCommunities/any() and companyType eq 'HB' and salesStatusDescription eq 'Active'`;
		const selectOnMarkets = `id, number, name, companyType, salesStatusDescription`;
		const orderByOnMarkets = `name`;

		const qryStrOnMarkets = `${this._ds}expand=${encodeURIComponent(expandOnMarkets)}&${this._ds}filter=${encodeURIComponent(filterOnMarkets)}&${this._ds}select=${encodeURIComponent(selectOnMarkets)}&${this._ds}orderby=${encodeURIComponent(orderByOnMarkets)}`;

    endPoint += `markets?${qryStrOnMarkets}`;

		this._financialMarkets$ = this._http.get<any>(endPoint).pipe(
			map(response =>
          {
            let markets = response['value'] as Array<IMarket>;
				return markets;
			}),
			catchError(this.handleError),
			publishReplay(1)
        ) as ConnectableObservable<Array<IMarket>>;
    this._financialMarkets$.connect();
	}

  getSalesCommunity(id: number, includeMarket: boolean = false): Observable<ISalesCommunity>
  {
		const entity = `salesCommunities`;
		const expand = `market($select = id, number, name)`;
		const filter = `id eq ${id}`;
		const select = `id, number, name`;

		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		if (includeMarket) {
			qryStr += `&${this._ds}expand=${encodeURIComponent(expand)}`;
		}

    const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response =>
			{
        		const communities = response.value as Array<ISalesCommunity>;
        		const community = communities && communities.length > 0 ? communities[0] : null;
				return community;
			}),
			catchError(this.handleError));
	}

	getWebSiteCommunity(salesCommunityId: number): Observable<IWebSiteCommunity>
  	{
		const entity = `salesCommunities(${salesCommunityId})`;
		const expand = `salesCommunityWebSiteCommunityAssocs($expand=websiteCommunity($filter=orgStatusDescription eq 'Active' and webSiteIntegrationKey ne ''))`;
		let qryStr = `${this._ds}expand=${encodeURIComponent(expand)}`;

    	const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response => {
				const r = response.salesCommunityWebSiteCommunityAssocs as Array<ISalesCommunityWebSiteCommunityAssoc>;
				let websiteCommunities = r
					.map(x => x.webSiteCommunity)
					.filter(x => x.orgStatusDescription === 'Active' && !!x.webSiteIntegrationKey)
					.sort((a, b) => new Date(a.lastModifiedUtcDate).valueOf() - new Date(b.lastModifiedUtcDate).valueOf())
					.reverse();
				return websiteCommunities[0];
			}),
			catchError(this.handleError)
		);
	}

  getFinancialMarkets(): Observable<Array<IMarket>>
	{
		return this._financialMarkets$;
	}

  getSalesCommunities(marketId: number): Observable<Array<ISalesCommunity>>
  {
    // Check to see if we already stored communities for this market.
    if (this.marketCommunities[marketId])
    {
      return of(this.marketCommunities[marketId]);
    }

    const filter = `marketId eq ${marketId} and (salesStatusDescription eq 'Active' or salesStatusDescription eq 'New')`;
    const expand = `financialCommunities($select=id, name, number, isDesignPreviewEnabled;$filter=salesStatusDescription eq 'Active' or salesStatusDescription eq 'New')`
	const orderBy = `name`;

    const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;
    let url = `${environment.apiUrl}salesCommunities?${qryStr}`;

	return this._http.get(url).pipe(
	  map(response =>
      {
        const communities: Array<ISalesCommunity> = response['value'];
        this.marketCommunities[marketId] = communities;
        return communities;
      }),
      catchError(this.handleError)
	 );
	}

  getMarkets(): Observable<Array<IMarket>>
    {
      let retMarkets: Observable<Array<IMarket>> = this.getFinancialMarkets().
			pipe(
				map(markets =>
				{
					let marketList = markets.map(m =>
					{
						let market = {
							id: m.id,
							name: m.name,
							number: m.number
						};

						return market;
					});

					return marketList;
				})
			);

		return retMarkets;
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

	getTreeVersions(commId, integrationKey)
	{
		const currentDate = new Date();
		let url = environment.apiUrl;

		const filter = `dTree/plan/org/edhFinancialCommunityId eq ${commId} and dTree/plan/integrationKey eq '${integrationKey}' and (PublishEndDate gt ${currentDate.toISOString()} or PublishEndDate eq null)`;
		const expand = `dTree($select=dTreeID;$expand=plan($select=integrationKey),org($select=edhFinancialCommunityId)),baseHouseOptions($select=planOption;$expand=planOption($select=integrationKey))`;
		const select = `dTreeVersionId, dTreeVersionName, publishStartDate, publishEndDate`;
		const orderBy = `publishStartDate`;
		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		url += `dTreeVersions?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response => {
				let treeVersions = response.value.map(tree => {
					return {
						dTreeVersionId: tree.dTreeVersionID,
						dTreeVersionName: tree.dTreeVersionName,
						publishStartDate: tree.publishStartDate,
						publishEndDate: tree.publishEndDate
					};
				}) as Array<ITreeVersion>;

				return treeVersions;
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
