import { AuthConfig } from 'angular-oauth2-oidc';
import { IConfiguration, IConfig } from '@microsoft/applicationinsights-web';

export interface IEnvironment {
	production: boolean;
	apiUrl: string;
	hubUrl: string;
	designToolUrl: string;
	thoUrl: string;
	alphaVisionBuilderGuid: string;
	tenant: string;
	clientId: string;
	authConfig: AuthConfig;
	authQueryParams: string;
	appInsights: IConfiguration & IConfig;
	alphavision: { builderId: string };
	pdfViewerBaseUrl: string;
	whatFix: { scriptUrl: string };
	thoUrls: { pulte: string, delWebb: string, americanWest: string, diVosta: string, johnWieland: string, centex: string };
	EBillUrl: string;
}
