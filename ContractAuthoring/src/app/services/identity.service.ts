import { Injectable } from '@angular/core';
import * as jwt_decode from 'jwt-decode';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { of } from 'rxjs/observable/of';
import { from } from 'rxjs/observable/from';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { tap, map } from 'rxjs/operators';

declare var OfficeHelpers: any;

@Injectable()
export class IdentityService {
    public authenticator: OfficeHelpers.Authenticator;
    private _token: OfficeHelpers.IToken;

    constructor() { }

    public init(): Promise<OfficeHelpers.IToken> {
        console.log("initializing new authenticator");
        this.authenticator = new OfficeHelpers.Authenticator();

        let endpointStorage: string;
        let tokenStorage: string;

        console.log("register Azure AD Auth");
        this.authenticator.endpoints.registerAzureADAuth(environment.config.clientId, environment.config.tenant, {
            responseType: 'id_token token',
        });

        console.log("looking for existing tokens");
        // return cached token if it hasn't expired
        if (this.authenticator.tokens.count) {
            console.log("number of tokens:", this.authenticator.tokens.count);
            let cachedToken: OfficeHelpers.IToken = null;
           
            try {
                console.log("try to get AzureAD cached token...");

                endpointStorage = window.localStorage.getItem("@OAuth2Endpoints/AzureAD");
                tokenStorage = window.localStorage.getItem("@OAuth2Tokens/AzureAD");
                console.log("endpointStorage:", endpointStorage);
                console.log("tokenStorage:", tokenStorage);

                cachedToken = this.authenticator.tokens.get(OfficeHelpers.DefaultEndpoints.AzureAD);

                if (cachedToken) {
                    console.log("cached token found, check if it's expired...");
                    if (!this.isTokenExpired(cachedToken)) {
                        console.log("cached token not expired so returning it...");
                        this._token = cachedToken;
                        return Promise.resolve(cachedToken);
                    }
                }
            } catch (e) {
                console.log("get cached token error:", e);

                endpointStorage = window.localStorage.getItem("@OAuth2Endpoints/AzureAD");
                tokenStorage = window.localStorage.getItem("@OAuth2Tokens/AzureAD");
                console.log("endpointStorage:", endpointStorage);
                console.log("tokenStorage:", tokenStorage);

                console.log("clearing local storage for endpoints...");
                if (endpointStorage) window.localStorage.removeItem("@OAuth2Endpoints/AzureAD");
                console.log("clearing local storage for tokens...");
                if (tokenStorage) window.localStorage.removeItem("@OAuth2Tokens/AzureAD");

                console.log("register Azure AD Auth, again...");
                this.authenticator.endpoints.registerAzureADAuth(environment.config.clientId, environment.config.tenant, {
                    responseType: 'id_token token',
                });
            }
        }

        console.log("didn't get cached token, so force authenticate...");

        // otherwise, authenticate and return token
        const authPromise = this.authenticator.authenticate(OfficeHelpers.DefaultEndpoints.AzureAD, true);

        authPromise.then((token) => {
            this._token = token;
        }).catch(OfficeHelpers.Utilities.log);

        return authPromise;
    }

    public get token(): Observable<string> {
        // return cached token if it hasn't expired
        console.log("checking if token exists...");
        if (this._token && this._token.id_token) {
            console.log("token exists, checking for expired token...");
            if (!this.isTokenExpired(this._token)) {
                console.log("token not expired, return it...");
                return of(this._token.id_token);
            }
            else {
                console.log("token expired...");
            }
        }        

        console.log("re-authenticating...");

        // otherwise, authenticate and return token
        return from(this.authenticator.authenticate(OfficeHelpers.DefaultEndpoints.AzureAD, true)).pipe(
            tap(token => this._token = token),
            map(token => token.id_token)
        );
    }

    public get idToken(): OfficeHelpers.IToken {
        return this._token;
    }

    isTokenExpired(token: OfficeHelpers.IToken): boolean {
        return token.expires_at <= new Date();
    }

    // decode token
    public get userProfile(): UserProfile {

        return this._token ? jwt_decode(this._token.id_token) : null;
    }

    // gets the AD roles that the user belongs to
    public getRoles(): string[] {
        return this.userProfile.roles;
    }

    // checks to see if user belongs to all roles
    public isInAllRoles(...neededRoles: Array<string>): boolean {
        const r = this.getRoles().map(r => r.toLocaleLowerCase());
        return neededRoles.every(neededRole => r.indexOf(neededRole.toLocaleLowerCase()) !== -1);
    }

    // checks to see if user belongs to a specific role
    public isInRole(neededRole: string): boolean {
        const r = this.getRoles().map(r => r.toLocaleLowerCase());
        neededRole = neededRole.toLocaleLowerCase();
        return (r.indexOf(neededRole) !== -1);
    }

    // checks to see if user has any of the roles specified
    public hasRole(neededRoles: Array<string>): boolean {
        const r = this.getRoles().map(r => r.toLocaleLowerCase());
        return neededRoles.some(neededRole => r.indexOf(neededRole.toLocaleLowerCase()) !== -1);
    }
}

class UserProfile {
    aud: string;
    iss: string;
    iat: Date;
    nbf: Date;
    exp: Date;
    aio: string;
    amr: string;
    at_hash: string;
    family_name: string;
    given_name: string;
    ipaddr: string;
    name: string;
    nonce: string;
    oid: string;
    onprem_sid: string;
    roles: string[];
    sub: string;
    tid: string;
    unique_name: string;
    upn: string;
    uti: string;
    ver: string;
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
    forOrg(orgId: string) {
        return `ORG_${orgId}`;
    }
};
