import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { map, catchError, flatMap } from 'rxjs/operators';

import { Settings } from '../../shared/models/settings.model';

import { LoggingService } from '../../core/services/logging.service';
import { SettingsService } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class CopyTreeService
{
    private _ds: string = encodeURIComponent('$');

    constructor(private _http: HttpClient, private _loggingService: LoggingService, private _storageService: StorageService) { }

    getTreeVersions(commId: number, planKey: string): Observable<Array<ITreeVersion>>
	{
		let url = settings.apiUrl;

		const filter = `dTree/plan/org/edhFinancialCommunityId eq ${commId} and dTree/plan/integrationKey eq '${planKey}'`;
		const select = `dTreeVersionID, dTreeVersionName, publishStartDate, lastModifiedDate`;
		const orderBy = `publishStartDate`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		url += `dTreeVersions?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
				{
					let plans = response['value'] as Array<ITreeVersion>;

					return plans;
				}),
			catchError(this.handleError));
    }

    getDraftTreeVersionId(commId: number, planKey: string): Observable<number>
    {
		let url = settings.apiUrl;

		const filter = `dTree/org/edhFinancialCommunityId eq ${commId} and dTree/plan/integrationKey eq '${planKey}' and (publishStartDate eq null or publishStartDate gt now())`;
		const select = `dTreeVersionID`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `dTreeVersions?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
				{
					let version = response['value'] as ITreeVersion[];

					return version.length > 0 ? version[0].dTreeVersionID : 0 ;
				}),
			catchError(this.handleError));
    }

    deleteDraftTreeVersion(treeVersionId: number): Observable<any>
    {
		let url = settings.apiUrl;

		url += `dTreeVersions(${treeVersionId})`;

		return this._http.delete(url).pipe(
			map(response =>
				{
					return response;
				}),
			catchError(this.handleError));
    }

    copyTreeVersionTo(commId: number, planKey: string, treeVersionId: number): Observable<number>
    {
		const body = {
			"commId": commId,
			"planKey": planKey,
			"treeVersionId": treeVersionId
		};

		let url = settings.apiUrl + `CopyTreeVersionTo`;

		return this._http.post(url, body).pipe(
			map(response =>
				{
					const treeVersion = response as ITreeVersionDto;

					return treeVersion.id;
				}),
			catchError(this.handleError));
    }

    private handleError(error: Response)
    {
        // In the future, we may send the server to some remote logging infrastructure.
        console.error(error);

        return _throw(error || 'Server error');
    }
}

export interface ITreeVersion
{
    dTreeVersionID: number;
    dTreeVersionName: string;
    publishStartDate: string;
    lastModifiedDate: string;
}

export interface ITreeVersionDto
{
    id: number;
    treeId: number;
    planKey: string;
    name: string;
    description: string;
    publishStartDate: string;
    publishEndDate: string;
    lastModifiedDate: string;
}
