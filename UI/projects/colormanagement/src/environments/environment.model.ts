import { AuthConfig } from 'angular-oauth2-oidc';
import { IConfiguration, IConfig } from '@microsoft/applicationinsights-web';

export interface IEnvironment {
    apiUrl: string;
    authQueryParams: string;
    appInsights: IConfiguration & IConfig;
	authConfig: AuthConfig;
    production: boolean;
    whatFix: { scriptUrl: string };
};
