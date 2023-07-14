import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { withSpinner } from 'phd-common';
import { Subject, Observable, ReplaySubject, throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { clearPresaleSessions, setPresaleSession } from '../../shared/classes/utils.class';
import { PresaleAuthToken, PresaleAuthTokenBody } from '../../shared/models/presale-payload.model';

@Injectable()
export class AuthService 
{
	private authConfig: Subject<AuthConfig> = new ReplaySubject<AuthConfig>(1);

	constructor(private _http: HttpClient, private osvc: OAuthService) { }

	public get salesAgreementNumber(): string 
	{
		return this.osvc.getIdentityClaims()['salesAgreementId'];
	}

	public getAuthConfig(): Observable<AuthConfig> 
	{
		return this.authConfig;
	}

	public setAuthConfig(config: AuthConfig): void 
	{
		this.authConfig.next(config);
	}

	public getIsPresaleAuthenticated(planGuid: string, source: string): Observable<boolean>
	{
		const url = `${environment.apiUrl}token`;
		const body =
			{
				code: planGuid,
				source: source
			} as PresaleAuthTokenBody;

		return withSpinner(this._http).post<PresaleAuthToken>(url, body).pipe(
			map(response => 
			{
				setPresaleSession(response.token, true, planGuid);
				return true;
			}),
			catchError(error =>
			{
				console.error(error);
				clearPresaleSessions();
				return _throw(error);
			}),
		);
	}
}