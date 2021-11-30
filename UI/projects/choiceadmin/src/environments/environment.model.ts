import { AuthConfig } from 'angular-oauth2-oidc';
import { IConfiguration, IConfig } from '@microsoft/applicationinsights-web';
import { CloudinaryConfiguration } from '@cloudinary/angular-5.x';

export interface IEnvironment {
	apiUrl: string;
	tenant: string;
	authQueryParams: string;
	pictureParkAssetUrl: string;
	designToolUrl: string;
	designPreviewUrl: string;
	appInsights: IConfiguration & IConfig;
	cloudinary: CloudinaryConfiguration;
	authConfig: AuthConfig;
	production: boolean;
	whatFix: { scriptUrl: string };
	colorManagementUrl: string;
};
