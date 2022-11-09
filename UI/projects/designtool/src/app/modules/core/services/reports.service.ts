import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { withSpinner, SummaryData, SummaryReportType } from 'phd-common';

@Injectable()
export class ReportsService
{
	constructor(private _http: HttpClient) { }

	getSelectionSummary(reportType: SummaryReportType, summaryData: SummaryData): Observable<string>
	{
		const action = this.getSummaryAction(reportType);
		const url = `${environment.apiUrl}${action}`;
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

	private getSummaryAction(reportType: SummaryReportType): string
	{
		switch (reportType)
		{
			case SummaryReportType.SELECTIONS:
			case SummaryReportType.SELECTIONS_IMAGES:
				return 'GetSelectionSummary';
			case SummaryReportType.OPTION_DETAILS:
			case SummaryReportType.OPTION_DETAILS_IMAGES:
				return 'GetOptionDetails';
			case SummaryReportType.FLOOR_PLAN:
				return 'GetFloorPlan';
			case SummaryReportType.CHOICE_LIST:
				return 'GetChoiceList';
			case SummaryReportType.DESIGN_CHOICE_LIST:
				return 'GetDesignChoiceList';
			case SummaryReportType.SALES_CHOICE_LIST:
				return 'GetSalesChoiceList';
		}
	}
}
