import { AuthConfig } from 'angular-oauth2-oidc';
import { CloudinaryConfiguration } from '@cloudinary/angular-5.x';
import { IConfiguration, IConfig } from '@microsoft/applicationinsights-web';

export interface IEnvironment
{
	production: boolean;
	apiUrl: string;
	authConfigs: { [key: string]: AuthConfig };
	authQueryParams: string;
	appInsights: IConfiguration & IConfig;
	cloudinary: CloudinaryConfiguration;
	alphavision: { builderId: string };
	pdfViewerBaseUrl: string;
	brandMap: { pulte: string, delwebb: string, americanWest: string, divosta: string, johnWieland: string, centex: string };
	adobeUrl: string;
	brandLogoutMap: { pulte: string, delwebb: string, americanWest: string, divosta: string, johnWieland: string, centex: string };
}
