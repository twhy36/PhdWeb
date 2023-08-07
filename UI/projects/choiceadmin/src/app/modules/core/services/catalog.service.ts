import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';;

import { map, catchError } from 'rxjs/operators';

import { SettingsService } from './settings.service';

import { Settings } from '../../shared/models/settings.model';
import { LoggingService } from 'phd-common';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class CatalogService
{
	private _ds: string = encodeURIComponent("$");

	private _canEdit: boolean
	public get canEdit(): boolean
	{
		return this._canEdit;
	}

	constructor(private _http: HttpClient, private _loggingService: LoggingService) { }

	/**
	 * Checks to see if the entered label already exists.
	 * @param route
	 * @param column
	 * @param label
	 */
	getLabelExistCount(route: string, column: string, label: string, additionalFilter?: string): Observable<boolean>
	{
		let url = settings.apiUrl;
		label = label.replace(/'/g, "''");

		const filter = `tolower(${column}) eq tolower('${label}') ${additionalFilter ? additionalFilter : ''}`;
		const select = `${column}`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}top=10&${this._ds}count=true`;

		url += `${route}?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let count = response['@odata.count'] as number;

				return count > 0;
			}),
			catchError(this.handleError));
	}

	/**
	 * Checks to see if the Catalog Item is in use or not.
	 * @param route
	 * @param filterCol
	 * @param selectCol
	 * @param id
	 */
	getCatItemCount(route: string, filterCol: string, selectCol: string, id: number): Observable<boolean>
	{
		let url = settings.apiUrl;

		const filter = `${filterCol} eq ${id}`;
		const select = `${selectCol}`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}count=true`;

		url += `${route}?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let count = response['@odata.count'] as number;

				return count > 0;
			}),
			catchError(this.handleError));
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);

		return _throw(error || 'Server error');
	}
}
