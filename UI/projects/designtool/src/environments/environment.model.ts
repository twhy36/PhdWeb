import { AuthConfig } from 'angular-oauth2-oidc';
import { CloudinaryConfiguration } from '@cloudinary/angular-5.x';
import { IConfiguration, IConfig } from '@microsoft/applicationinsights-web';

export interface IEnvironment
{
	production: boolean;
	apiUrl: string;
	hubUrl: string;
	baseUrl: {
		designPreviewUrls: {
			pulte: string;
			delWebb: string;
			americanWest: string;
			diVosta: string;
			centex: string;
			johnWieland: string;
		};
	},
	tenant: string;
	clientId: string;
	authConfig: AuthConfig;
	authQueryParams: string;
	appInsights: IConfiguration & IConfig;
	cloudinary: CloudinaryConfiguration;
	alphavision: { builderId: string };
	pdfViewerBaseUrl: string;
	whatFix: { scriptUrl: string };
	EBillUrl: string;
}
