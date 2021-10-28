import { forwardRef, Inject, Injectable, InjectionToken } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { take, filter } from 'rxjs/operators';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('authConfig');
export const WINDOW_ORIGIN = new InjectionToken<string>('origin');
export const API_URL = new InjectionToken<string>('apiUrl');

@Injectable()
export class IdentityService {
    private loggedInSubject$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);

    public init(): Observable<boolean> {
        return this.loggedInSubject$.pipe(take(1));
    }

    public get loggedIn(): Observable<boolean> {
        return this.loggedInSubject$;
    }

    constructor(@Inject(forwardRef(() => OAuthService)) private osvc: OAuthService,
        @Inject(forwardRef(() => AUTH_CONFIG)) private authConfig: AuthConfig,
        @Inject(forwardRef(() => WINDOW_ORIGIN)) private origin: string,
        @Inject(forwardRef(() => ApplicationInsights)) private appInsights: ApplicationInsights) {
        this.configure(this.authConfig);

        this.loggedInSubject$.pipe(
            filter(loggedIn => loggedIn),
            take(1)
        ).subscribe(() => 
        {
            this.appInsights.setAuthenticatedUserContext(this.osvc.getIdentityClaims()['preferred_username']);
            this.appInsights.trackTrace({message: `ContractAuthoring - user authenticated`});
        });
    }

    private configure(authConfig: AuthConfig) {
        debugger;
        authConfig.redirectUri = this.origin;
        this.osvc.configure(authConfig);
        this.osvc.setupAutomaticSilentRefresh();
        this.osvc.loadDiscoveryDocumentAndTryLogin({
            preventClearHashAfterLogin: true
        }).then(res => {
            this.loggedInSubject$.next(this.osvc.hasValidAccessToken() && this.osvc.hasValidIdToken());
        });
    }

    public login(): void {
        this.osvc.initLoginFlow();
    }
}
