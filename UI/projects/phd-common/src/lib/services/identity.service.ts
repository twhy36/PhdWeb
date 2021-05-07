import { Injectable, Inject, forwardRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, ReplaySubject, throwError as _throw, of } from "rxjs";

import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';

import { map, catchError, tap, share, take, switchMap } from 'rxjs/operators';

import { ClaimTypes, Claims, Permission } from '../models/claims.model';
import { API_URL, AUTH_CONFIG, WINDOW_ORIGIN } from '../injection-tokens';
import { UserProfile } from '../models/user-profile.model';

function isObservable<T>(obj: Observable<T> | T): obj is Observable<T>
{
	return obj instanceof Observable;
}

@Injectable()
export class IdentityService
{
	//private _user: ReplaySubject<adal.User> = new ReplaySubject(1);
	private loggedInSubject$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);

	private readonly _graphUrl = "https://graph.microsoft.com";

	private claims: Claims;
	private assignedMarkets: Array<{ id: number, number: string }>;
	private getClaims$: Observable<Claims>;
	private getAssignedMarkets$: Observable<Array<{ id: number, number: string }>>;

	public get token(): Observable<string>
	{
		return this.loggedInSubject$.pipe(
			take(1),
			map(() => this.osvc.getAccessToken())
		);
	}

	public get user(): Observable<UserProfile>
	{
		return this.loggedInSubject$.pipe(
			take(1),
			map(loggedIn =>
			{
				if (loggedIn)
				{
					let claims: any = this.osvc.getIdentityClaims() ?? {};

					return {
						displayName: claims.name || null,
						familyName: claims.family_name || null,
						givenName: claims.given_name || null,
						businessPhones: null,
						city: null,
						mail: null,
						mobilePhone: null,
						postalCode: null,
						state: null,
						streetAddress: null,
						upn: claims.preferred_username
					} as UserProfile;
				}
				else
				{
					return null;
				}
			})
		);
	}

	public get isLoggedIn(): Observable<boolean>
	{
		return this.loggedInSubject$;
	}

	constructor(@Inject(forwardRef(() => HttpClient)) private httpClient: HttpClient,
		@Inject(forwardRef(() => OAuthService)) private osvc: OAuthService,
		@Inject(forwardRef(() => API_URL)) private apiUrl: string,
		@Inject(forwardRef(() => AUTH_CONFIG)) private authConfig: AuthConfig | Observable<AuthConfig>,
		@Inject(forwardRef(() => WINDOW_ORIGIN)) private origin: string)
	{
		if (isObservable(this.authConfig))
		{
			this.authConfig.pipe(take(1)).subscribe(config =>
			{
				this.configure(config);
			});
		}
		else
		{
			this.configure(this.authConfig);
		}

		this.getClaims$ = this.httpClient.get<Claims>(`${this.apiUrl}GetUserPermissions`).pipe(
			tap(c => this.claims = c),
			share()
		);

		this.getAssignedMarkets$ = this.httpClient.get<any>(`${this.apiUrl}assignedMarkets?$select=id,number&$filter=companyType eq 'HB' and salesStatusDescription eq 'Active'`).pipe(
			map(response => response.value.map(mkt => <{ id: number, number: string }>mkt)),
			tap(mkts => this.assignedMarkets = mkts),
			share()
		);
	}

	private configure(authConfig: AuthConfig)
	{
		authConfig.redirectUri = this.origin;

		this.osvc.configure(authConfig);
		this.osvc.setupAutomaticSilentRefresh();
		
		if (this.apiUrl.indexOf('http://localhost:2845') === 0)
		{
			if (window.location.search.indexOf('?code=') !== 0 && window.location.pathname !== '/')
			{
				sessionStorage.setItem('uri_state', window.location.href);
			}
		}

		this.osvc.loadDiscoveryDocumentAndTryLogin().then(res =>
		{
			this.loggedInSubject$.next(this.osvc.hasValidAccessToken() && this.osvc.hasValidIdToken());

			if (window.location.pathname === '/' && sessionStorage.getItem('uri_state') && this.osvc.hasValidIdToken())
			{
				const uri = sessionStorage.getItem('uri_state');
				sessionStorage.removeItem('uri_state');
				window.location.href = uri;
			}
		});
	}

	public init(): Observable<boolean>
	{
		return this.loggedInSubject$.pipe(take(1));
	}

	public login(state?: any): void
	{
		this.osvc.initLoginFlow(state ? JSON.stringify(state) : null);
	}

	public logout(): void
	{
		this.osvc.logOut();
	}

	// gets profile info from AD via Graph
	public getMe(): Observable<UserProfile>
	{
		return of(null);
		//return this.service.userInfo && this.service.userInfo.authenticated ? of(this.service.userInfo.token) : this.getAccessToken()
		//	.pipe(
		//		flatMap(accessToken =>
		//		{
		//			let headers = new HttpHeaders();
		//			headers = headers.append('Authorization', 'Bearer ' + accessToken);

		//			const url = 'https://graph.microsoft.com/v1.0/me/?$select=displayName,mail,streetAddress,city,postalCode,state,mobilePhone,businessPhones';
		//			return this.httpClient.get(url, { headers })
		//				.pipe(
		//					map(response =>
		//					{
		//						const profile = response as UserProfile;
		//						return profile;
		//					}));
		//		})
		//		, catchError(this.handleError)
		//	);
	}

	// gets the AD roles that the user belongs to
	public getRoles(): Observable<string[]>
	{
		return this.loggedInSubject$.pipe(
			take(1),
			map(loggedIn =>
			{
				if (loggedIn)
				{
					let claims: any = this.osvc.getIdentityClaims() ?? {};

					return claims.roles || [];
				}
				else
				{
					return null;
				}
			})
		);
	}

	// checks to see if user belongs to all roles
	public isInAllRoles(...neededRoles: Array<string>): Observable<boolean>
	{
		return this.getRoles()
			.pipe(
				map(roles =>
				{
					roles = roles.map(role => role.toLocaleLowerCase());

					return neededRoles.every(neededRole => roles.includes(neededRole.toLocaleLowerCase()));
				})
				, catchError(this.handleError)
			);
	}

	// checks to see if user belongs to a specific role
	public isInRole(neededRole: string): Observable<boolean>
	{
		neededRole = neededRole.toLocaleLowerCase();
		return this.getRoles()
			.pipe(
				map(roles =>
				{
					roles = roles.map(role => role.toLocaleLowerCase());

					return roles.includes(neededRole);
				})
				, catchError(this.handleError)
			);
	}

	// checks to see if user has any of the roles specified
	public hasRole(neededRoles: Array<string>): Observable<boolean>
	{
		return this.getRoles()
			.pipe(
				map(roles =>
				{
					roles = roles.map(role => role.toLocaleLowerCase());

					return neededRoles.some(neededRole => roles.includes(neededRole.toLocaleLowerCase()));
				})
				, catchError(this.handleError)
			);
	}

	// gets access token for Graph API
	private getAccessToken(): Observable<string>
	{
		return of(null);
		//const token = this.service.getCachedToken(this._graphUrl);

		//if (token)
		//{
		//	return of(token);
		//}

		//return this.service.acquireToken(this._graphUrl)
		//	.pipe(
		//		flatMap(token =>
		//		{
		//			return token;
		//		}));
	}

	private handleError(error: any)
	{
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);

		return _throw(error || 'Server error');
	}

	public hasClaim(claim: ClaimTypes): Observable<boolean>
	{
		return this.getClaims().pipe(
			map(c => !!c[claim])
		);
	}

	public hasClaimWithPermission(claim: ClaimTypes, permission: Permission): Observable<boolean>
	{
		return this.getClaims().pipe(
			map(c => c[claim] || 0),
			map(p => (permission & p) !== 0)
		);
	}

	public hasMarket(market: number | string): Observable<boolean>
	{
		return this.getAssignedMarkets().pipe(
			map(mkts =>
			{
				if (typeof market === 'number')
				{
					return mkts.some(mkt => mkt.id === market);
				}
				else
				{
					return mkts.some(mkt => mkt.number === market);
				}
			})
		);
	}

	public getClaims(): Observable<Claims>
	{
		if (this.claims)
		{
			return of(this.claims);
		}

		return this.getClaims$;
	}

	public getAssignedMarkets(): Observable<Array<{ id: number, number: string }>>
	{
		if (this.assignedMarkets)
		{
			return of(this.assignedMarkets);
		}

		return this.getAssignedMarkets$;
	}

	public getContactId(): Observable<number>
	{
		return this.loggedInSubject$.pipe(
			take(1),
			map(loggedIn =>
			{
				if (loggedIn)
				{
					let claims: any = this.osvc.getIdentityClaims() ?? {};

					return claims.oid || null;
				}
				else
				{
					return null;
				}
			}),
			switchMap(oid => !!oid
				? this.httpClient.get<any>(`${this.apiUrl}contacts?$filter=adIntegrationKey eq ${oid}&$select=id`)
				: of(null)),
			map(response => response && response.value && response.value.length ? response.value[0].id : 0)
		);
	}
}

export const Roles = {
	ItSupport: "ITSupport",
	CatalogManager: "CatalogManager",
	TreeManager: "TreeManager",
	AllOrgs: "ORG_All",
	HomeSiteManager: "SiteAdmin",
	SalesConsultant: 'SalesConsultant',
	SalesManager: 'SalesManager',
	/** Gets the dynamic role name for a specific org */
	forOrg(orgId: string)
	{
		return `ORG_${orgId}`;
	}
};
