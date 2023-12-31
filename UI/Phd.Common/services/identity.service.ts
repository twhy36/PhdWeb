import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, ReplaySubject, Observer ,  NEVER as never ,  throwError as _throw ,  of } from "rxjs";

import { AdalService } from 'adal-angular4';
import { AppInsights } from "applicationinsights-js";

import { UserProfile } from '../models/user-profile.model';
import { map, catchError, flatMap, tap, share, take, switchMap } from 'rxjs/operators';

import { API_URL } from '../phd-common.module';
import { ClaimTypes, Claims, Permission } from '../models';
import { modifyAdal } from '../utils/adal';

@Injectable()
export class IdentitySettings
{
	tenant: string;
	clientId: string;
	authQueryParams: string;
}

@Injectable()
export class IdentityService
{
	private _user: ReplaySubject<adal.User> = new ReplaySubject(1);

	private readonly _graphUrl = "https://graph.microsoft.com";

	private config: adal.Config;
	private claims: Claims;
	private apiUrl: string;
	private assignedMarkets: Array<{ id: number, number: string }>;
	private service: AdalService;
	private getClaims$: Observable<Claims>;
	private getAssignedMarkets$: Observable<Array<{ id: number, number: string }>>;

    public get token(): Observable<string> {
        return this.user.pipe(
            switchMap(() => {
                const token = this.service.getCachedToken(this.config.clientId);

                if (token) {
                    return of(token);
                }

                return this.service.acquireToken(this.config.clientId).pipe(
                    catchError(() => {
                        return new Observable((observer: Observer<string>) => {
                            this.service.clearCache();
                            this.service.login();
                            let sub = this._user.subscribe(u => {
                                const newToken = this.service.getCachedToken(this.config.clientId);
                                if (!!newToken) {
                                    observer.next(newToken);
                                    observer.complete();
                                    sub.unsubscribe();
                                }
                            });
                        });
                    })
                );
            })
        );
	}

	public get user(): Observable<adal.User>
	{
        return this._user.pipe(
            take(1)   
        );
	}

	constructor(private httpClient: HttpClient, private settings: IdentitySettings, private injector: Injector)
	{
		this.apiUrl = this.injector.get(API_URL);
		this.config = {
			tenant: settings.tenant
			, clientId: settings.clientId
            , cacheLocation: "localStorage"
			, extraQueryParameter: settings.authQueryParams
			, popUp: true
            , expireOffsetSeconds: 900 // 15 minutes.  For testing set to 3480 = 58 min so should time out after 2 minutes
			//, postLogoutRedirectUri: 'url for sales portal'
		};
		this.service = this.injector.get("AdalService") as AdalService;

		this.service.init(<adal.Config>{
			...this.config, callback: function (error, token)
            {
				if (error) {
					AppInsights.trackException(error);
                    console.error(`Failed to acquire AD token: ${error}`);
                    return;
                }

				this.service.refreshDataFromCache();
				this._user.next(this.service.userInfo);
				sessionStorage.setItem('whatfix.uid', this.service.userInfo.profile.oid);
			}.bind(this)
		});

		//this is needed so the token renewal iframe can access the current Authentication Context
        (<any>window).adalContext = (<any>this.service).context;

        (<any>window).Logging = {
            level: 3,
			log: function (message) {
				AppInsights.trackTrace(message, { source: 'adal.js' });
            }
        };

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

	public init(): Observable<any>
    {
		modifyAdal();
		if (location.hash.indexOf('id_token=') === -1)
		{
			return new Observable((observer: Observer<string>) =>
			{
				// Check if the user is authenticated. If not, call the login() method
				if (!this.service.userInfo.authenticated)
                {
					this.service.login();
                    this.user.subscribe(u => observer.complete());
                }
				else
                {
                    this.service.refreshDataFromCache();
					this._user.next(this.service.userInfo);
					sessionStorage.setItem('whatfix.uid', this.service.userInfo.profile.oid);
                    observer.complete();
				}
			});
		}
		else
		{
			return new Observable<never>();
		}
	}

    /*
     * Pared down version of the adal-angular4 handleWindowCallback function. Not using the one built into AdalService because it would require bootstrapping
     * another instance of the whole application from within the hidden iframe.
     */
	static handleWindowCallback()
	{
		let adalContext = (<any>window.parent).adalContext;

		const hash = window.location.hash;
		if (adalContext.isCallback(hash))
		{
            const requestInfo = adalContext.getRequestInfo(hash);
            adalContext.saveTokenFromHash(requestInfo);
            const callback = adalContext._callBackMappedToRenewStates[requestInfo.stateResponse] || adalContext.callback;

			if (requestInfo.stateMatch)
            {
				if (typeof adalContext.callback === 'function')
				{
					if (requestInfo.requestType === adalContext.REQUEST_TYPE.RENEW_TOKEN)
                    {
						// Idtoken or Accestoken can be renewed
						if (requestInfo.parameters['access_token'])
						{
							callback(adalContext._getItem(adalContext.CONSTANTS.STORAGE.ERROR_DESCRIPTION)
								, requestInfo.parameters['access_token']);
						} else if (requestInfo.parameters['id_token'])
						{
							callback(adalContext._getItem(adalContext.CONSTANTS.STORAGE.ERROR_DESCRIPTION)
								, requestInfo.parameters['id_token']);
						} else if (requestInfo.parameters['error'])
						{
							adalContext._renewFailed = true;
                            callback(adalContext._getItem(adalContext.CONSTANTS.STORAGE.ERROR_DESCRIPTION), null);
						}
					}
				}
			}

			(<any>window.parent).document.querySelector('#adalIdTokenFrame').remove();
		}
	}

	// gets profile info from AD via Graph
	public getMe(): Observable<UserProfile>
	{

		return this.service.userInfo && this.service.userInfo.authenticated ? of(this.service.userInfo.token) : this.getAccessToken()
			.pipe(
				flatMap(accessToken =>
				{
					let headers = new HttpHeaders();
					headers = headers.append('Authorization', 'Bearer ' + accessToken);

					const url = 'https://graph.microsoft.com/v1.0/me/?$select=displayName,mail,streetAddress,city,postalCode,state,mobilePhone,businessPhones';
					return this.httpClient.get(url, { headers })
						.pipe(
							map(response =>
							{
								const profile = response as UserProfile;
								return profile;
							}));
				})
				, catchError(this.handleError)
			);
	}

	// gets the AD roles that the user belongs to
	public getRoles(): Observable<string[]>
	{
		return this.service.getUser()
			.pipe(
				map(user => user.profile['roles'])
				, catchError(this.handleError)
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

		const token = this.service.getCachedToken(this._graphUrl);

		if (token)
		{
			return of(token);
		}

		return this.service.acquireToken(this._graphUrl)
			.pipe(
				flatMap(token =>
				{
					return token;
				}));
	}

	private handleError(error: any)
	{
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);

		return _throw(error || 'Server error');
	}

	// Logout Method
	public logout()
	{
		this.service.logOut();
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
					return mkts.some(mkt => mkt.id === market);
				else return mkts.some(mkt => mkt.number === market);
			})
		);
	}

	public getClaims(): Observable<Claims>
	{
		if (this.claims) return of(this.claims);

		return this.getClaims$;
	}

	public getAssignedMarkets(): Observable<Array<{ id: number, number: string }>>
	{
		if (this.assignedMarkets) return of(this.assignedMarkets);

		return this.getAssignedMarkets$;
	}

	public getContactId(): Observable<number> {
		return this.user.pipe(
			switchMap(user => this.httpClient.get<any>(`${this.apiUrl}contacts?$filter=adIntegrationKey eq ${user.profile.oid}&$select=id`)),
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
