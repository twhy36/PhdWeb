import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SettingsService } from './settings.service';
import { Settings } from '../../shared/models/settings.model';
import { getDateWithUtcOffset } from 'phd-common';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class TreeService 
{
	constructor(private _http: HttpClient) 
	{
	}

	hasPlanTree(commId: number, planKey: string): Observable<boolean> 
	{
		let url = settings.apiUrl;
		const utcNow = getDateWithUtcOffset();

		const filter = `publishStartDate le ${utcNow} and (publishEndDate eq null or publishEndDate gt ${utcNow}) and dTree/plan/org/edhFinancialCommunityId eq ${commId} and dTree/plan/integrationKey eq '${planKey}'`;
		const select = `dTreeVersionID`;

		const qryStr = `${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		url += `dTreeVersions?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				return response ? (response.value ? response.value.length > 0 : false) : false;
			}),
			catchError(this.handleError));
	}

	getPlansWithTree(financialCommunityIdId: number, planKeys: string[]): Observable<string[]> 
	{
		let url = settings.apiUrl;
		const utcNow = getDateWithUtcOffset();

		const expand = `dTree($expand=plan($select=integrationKey);$select=dTreeId)`;

		const filterPlanKeys = planKeys.map(planKey => `dTree/plan/integrationKey eq '${planKey}'`).join(' or ');

		const filter = `publishStartDate le ${utcNow} and (publishEndDate eq null or publishEndDate gt ${utcNow}) and dTree/plan/org/edhFinancialCommunityId eq ${financialCommunityIdId} and (${filterPlanKeys})`;
		const select = `dTreeVersionID`;

		const qryStr = `${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		url += `dTreeVersions?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				return response?.value?.map(treeVersion => treeVersion?.dTree?.plan?.integrationKey).filter(key => !!key);
			}),
			catchError(this.handleError));
	}	

	private handleError(error: Response)
	{
		console.error(error);

		return _throw(error || 'Server error');
	}

}
