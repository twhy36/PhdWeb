import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { Settings } from '../../shared/models/settings.model';

import { LoggingService } from '../../core/services/logging.service';
import { SettingsService } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';
import { IPictureParkAsset } from '../../shared/models/image.model';

import { IdentityService, UserProfile } from 'phd-common';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class ImageService
{
	private _ds: string = encodeURIComponent('$');
	private user: UserProfile;

	constructor(private _http: HttpClient, private _loggingService: LoggingService, private _storageService: StorageService, private _identityService: IdentityService)
	{
		this._identityService.user.subscribe(u =>
		{
			this.user = u;
		});
	}

	getAssets(assets: IPictureParkAsset[]): Observable<IPictureParkAsset[]>
	{
		const body = {
			'assetSelections': assets
		};

		const action = `GetAssets`;
		const endpoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endpoint, body).pipe(
			map(response =>
			{
				const ppAssets = response.value.map(asset =>
				{
					return asset as IPictureParkAsset;
				});

				return ppAssets;
			}),
			catchError(this.handleError));
	}

	//gets the picture parkToken
	getPictureParkToken(): Observable<string>
	{
		return this.getUserEmail().pipe(
			switchMap(email =>
			{
				const profile = { given_name: this.user.givenName, family_name: this.user.familyName };
				const body = {
					'firstName': profile.given_name,
					'lastName': profile.family_name,
					'emailAddress': email
				};

				return this._http.post(`${settings.apiUrl}GetPictureParkToken`, body).pipe(
					map(response => response['value']))
			})
		);
	}

	getUserEmail(): Observable<string>
	{
		return this._http.get<any>(`${settings.apiUrl}GetLoggedInUserEmail`).pipe(
			map(response => response.value)
		);
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}
