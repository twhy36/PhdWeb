import { AuthConfig } from 'angular-oauth2-oidc';
import { IConfiguration, IConfig } from '@microsoft/applicationinsights-web';
import ICloudinaryConfigurations from '@cloudinary/url-gen/config/interfaces/Config/ICloudinaryConfigurations';

export interface IEnvironment
{
	production: boolean;
	apiUrl: string;
	authConfigs: { [key: string]: AuthConfig };
	authQueryParams: string;
	appInsights: IConfiguration & IConfig;
	cloudinary: ICloudinaryConfigurations;
	alphavision: { builderId: string };
	pdfViewerBaseUrl: string;
	brandMap: { pulte: string, delwebb: string, americanWest: string, divosta: string, johnWieland: string, centex: string };
	adobeUrl: string;
	brandLogoutMap: { pulte: string, delwebb: string, americanWest: string, divosta: string, johnWieland: string, centex: string };
}
