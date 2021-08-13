import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { withSpinner, SummaryData } from 'phd-common';

@Injectable()
export class ReportsService
{
	constructor(private _http: HttpClient) { }

	getFavoritesSummary(summaryData: SummaryData): Observable<string>
	{
		const url = `${environment.apiUrl}${'GetFavoritesSummary'}`;
		const headers = new HttpHeaders({
			'Content-Type': 'application/json',
			'Accept': 'application/pdf'
		});

		const data = { summaryData: summaryData };

		return withSpinner(this._http).post(url, data, { headers: headers, responseType: 'blob' }).pipe(
			map(response =>
			{
				return window.URL.createObjectURL(response);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

}
