import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Contact } from 'phd-common';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Settings } from '../../shared/models/settings.model';
import { SettingsService } from "./settings.service";

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class ContactService
{
    private _ds: string = encodeURIComponent('$');

    constructor(
        private _http: HttpClient
    ) { }

    getEmployeeContactsWithName(name: string): Observable<Array<Contact>>
    {
        const filter = `adEmployeeId ne null and adIsActive eq true and contains(displayName, '${name}')`
        const expand = `emailAssocs($expand=email($select=emailAddress);$select=email)`;
        const select = `id, firstName, lastName, jobTitle`;
        const orderby = `firstName, lastName`;

        const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

        const url = `${settings.apiUrl}contacts?${qryStr}`;

        return this._http.get(url).pipe(
            map(response =>
            {
                return response['value'].map(x => new Contact(x));
            }),
            catchError(this.handleError)
        );
    }

    private handleError(error: Response)
    {
        return throwError(error || 'Server error');
    }
}