import { Injectable } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { Subject, Observable, ReplaySubject } from 'rxjs';

@Injectable()
export class AuthService {
    private authConfig: Subject<AuthConfig> = new ReplaySubject<AuthConfig>(1);

    constructor(private osvc: OAuthService) {}

    public get salesAgreementNumber(): string {
        return this.osvc.getIdentityClaims()["salesAgreementId"];
    }

    public getAuthConfig(): Observable<AuthConfig> {
        return this.authConfig;
    }

    public setAuthConfig(config: AuthConfig): void {
        this.authConfig.next(config);
    }
}