import { Injectable } from '@angular/core';
import { SalesProgram } from "../../shared/models/salesPrograms.model";
import { HttpClient } from '@angular/common/http';
import { SettingsService } from "./settings.service";
import { Settings } from "../../shared/models/settings.model";
import { Observable ,  throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { withSpinner } from 'phd-common/extensions/withSpinner.extension';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class SalesService
{
	constructor(
		private _http: HttpClient,
		private _settingsService: SettingsService
	) { }

	/**
	 * Create/Edit Sales Program
	 * @param salesProgramDto
	 */
	saveSalesProgram(salesProgramDto: SalesProgram): Observable<SalesProgram>
	{
		if (salesProgramDto.id)
		{
			return this._http.patch(settings.apiUrl + `salesPrograms(${salesProgramDto.id})`, salesProgramDto, { headers: { 'Prefer': 'return=representation' } }).pipe(

				map((response: SalesProgram) =>
				{
					return response;
				}),
				catchError(this.handleError))
		}

		return this._http.post(settings.apiUrl + 'salesPrograms', salesProgramDto, { headers: { 'Content-Type': 'application/json' } }).pipe(
			map((response: SalesProgram) =>
			{
				return response;
			}),
			catchError(this.handleError))
	}

	getSalesPrograms(communityId: number): Observable<Array<SalesProgram>>
	{
		const expand = `salesAgreementSalesProgramAssocs($filter=salesAgreement/status eq 'OutforSignature' or salesAgreement/status eq 'Signed' or salesAgreement/status eq 'Approved' or salesAgreement/status eq 'Pending';$Top=1)`;
		const filter = `financialCommunityId eq ${communityId}`;
		const orderby = 'name';
		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}expand=${expand}&${encodeURIComponent("$")}orderby=${orderby}`;

		return withSpinner(this._http).get(`${settings.apiUrl}salesPrograms?${qryStr}`).pipe(
			map((response: Array<SalesProgram>) => 
			{
				return response['value'].map(program => 
					{
					return new SalesProgram(program);
				})
			}),
			catchError(this.handleError));
	}

	deleteSalesProgram(dto: SalesProgram)
	{
		let url = settings.apiUrl + `salesPrograms(${dto.id})`;

		return this._http.delete(url).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError))
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure
		return _throw(error || 'Server error');
	}
}
