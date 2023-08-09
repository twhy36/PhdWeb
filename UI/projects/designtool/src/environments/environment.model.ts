import { AuthConfig } from 'angular-oauth2-oidc';
import { IConfiguration, IConfig } from '@microsoft/applicationinsights-web';
import ICloudinaryConfigurations from '@cloudinary/url-gen/config/interfaces/Config/ICloudinaryConfigurations';

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
	cloudinary: ICloudinaryConfigurations;
	alphavision: { builderId: string };
	pdfViewerBaseUrl: string;
	defaultImageURL: string;
	whatFix: { scriptUrl: string };
	EBillUrl: string;
}
