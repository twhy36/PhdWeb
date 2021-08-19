import { AuthConfig } from 'angular-oauth2-oidc';
import { CloudinaryConfiguration } from '@cloudinary/angular-5.x';

export interface IEnvironment
{
	production: boolean;
	apiUrl: string;
	authConfigs: { [key: string]: AuthConfig };
	authQueryParams: string;
	appInsights: any;
	cloudinary: CloudinaryConfiguration;
	alphavision: { builderId: string };
	pdfViewerBaseUrl: string;
}
