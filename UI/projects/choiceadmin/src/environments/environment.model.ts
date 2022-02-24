import { AuthConfig } from 'angular-oauth2-oidc';
import { IConfiguration, IConfig } from '@microsoft/applicationinsights-web';

export interface IEnvironment {
	apiUrl: string;
	tenant: string;
	authQueryParams: string;
	pictureParkAssetUrl: string;
	designToolUrl: string;
	designPreviewUrls: {
		pulte: string;
		delWebb: string;
		americanWest: string;
		diVosta: string;
		centex: string;
		johnWieland: string;
	};
	appInsights: IConfiguration & IConfig;
	authConfig: AuthConfig;
	production: boolean;
	whatFix: { scriptUrl: string };
	colorManagementUrl: string;
};
