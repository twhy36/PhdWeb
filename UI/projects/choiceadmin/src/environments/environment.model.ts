import { AuthConfig } from 'angular-oauth2-oidc';

export interface IEnvironment {
	apiUrl: string;
	tenant: string;
	authQueryParams: string;
	pictureParkAssetUrl: string;
	designToolUrl: string;
	designPreviewUrl: string;
	appInsights: {
		instrumentationKey: string;
	};
	authConfig: AuthConfig;
	production: boolean;
	whatFix: { scriptUrl: string };
	colorManagementUrl: string;
};
