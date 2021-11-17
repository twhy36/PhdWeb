import { AuthConfig } from 'angular-oauth2-oidc';

export interface IEnvironment {
    apiUrl: string;
    authQueryParams: string;
    appInsights: {
        instrumentationKey: string;
	};
	authConfig: AuthConfig;
    production: boolean;
    whatFix: { scriptUrl: string };
};
