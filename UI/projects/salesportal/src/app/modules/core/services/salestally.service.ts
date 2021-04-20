import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError} from "rxjs";
import { map, catchError, mergeMap } from "rxjs/operators";
import { _throw } from 'rxjs/observable/throw';

import { environment } from '../../../../environments/environment';
import { TopCommunity, TopSalesConsultant, TopMarket, TimeFrame, AreaSales, ConsultantBuyer } from '../../shared/models/salestally.model';

@Injectable()
export class SalesTallyService
{
	constructor(private http: HttpClient) { }

	public getTopCommunity(timeFrame: TimeFrame): Observable<TopCommunity[]>
	{
		const entity = `GetSalesTallyTop10Community(TimeRange=${timeFrame.toString()})`;
		const endPoint = `${environment.apiUrl}${entity}`;

		return this.http.get<any>(endPoint).pipe(
			map(response => response.value as TopCommunity[]),
			catchError(this.handleError)
		);
	}

	public getTopMarket(timeFrame: TimeFrame): Observable<TopMarket[]>
	{
		const entity = `GetSalesTallyTop10Market(TimeRange=${timeFrame.toString()})`;
		const endpoint = `${environment.apiUrl}${entity}`;

		return this.http.get<any>(endpoint).pipe(
			map(response => response.value as TopMarket[]),
			catchError(this.handleError)
		);
	}

	public getTopSalesConsultant(timeFrame: TimeFrame): Observable<TopSalesConsultant[]>
	{
		const entity = `GetSalesTallyTop10SaleConsultants(TimeRange=${timeFrame.toString()})`;
		const endPoint = `${environment.apiUrl}${entity}`;

		return this.http.get<any>(endPoint).pipe(
			map(response => response.value as TopSalesConsultant[]),
			catchError(this.handleError)
		);
	}

	public getAreaSales(): Observable<AreaSales[]>
	{
		const endPoint = `${environment.apiUrl}salesTallyAreaSales`;

		return this.http.get<any>(endPoint).pipe(
			map(response => response.value as AreaSales[]),
			catchError(this.handleError)
		);
	}

	public getConsultantBuyers(salesConsultantId: number, communityId: number): Observable<ConsultantBuyer[]> {
		const entity = `GetSalesTallyConsultantBuyers(salesConsultantId=${salesConsultantId},communityId=${communityId})`;
		const endPoint = `${environment.apiUrl}${entity}`;

		return this.http.get<any>(endPoint).pipe(
			map(response => response.value as ConsultantBuyer[]),
			catchError(this.handleError)
		);
	}

	private handleError(error: Response) {
		// In the future, we may send the server to some remote logging infrastructure.
		console.error('Error message: ', error);

		return _throw(error || 'Server error');
	}
}
