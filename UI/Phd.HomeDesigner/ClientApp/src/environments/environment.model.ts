import { CloudinaryConfiguration } from '@cloudinary/angular-5.x';

export interface IEnvironment
{
	production: boolean;
	apiUrl: string;
	tenant: string;
	clientId: string;
	authQueryParams: string;
	appInsights: any;
	cloudinary: CloudinaryConfiguration;
	alphavision: { builderId: string };
}
