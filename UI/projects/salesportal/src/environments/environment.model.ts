import { AuthConfig } from 'angular-oauth2-oidc';

export interface IEnvironment {
    apiUrl: string;
    authQueryParams: string;
    baseUrl: {
		colorManagement: string;
        buyerTracker: string;
        choiceAdmin: string;
        crm: string;
        salesAdmin: string;
		designTool: string;
        designPreview: string;
        thoPreview: string;
        reports: string;
		homeSelections: string;
		salesTally: string;
    };
    appInsights: {
        instrumentationKey: string;
	};
	authConfig: AuthConfig;
    production: boolean;
    whatFix: { scriptUrl: string };
};
