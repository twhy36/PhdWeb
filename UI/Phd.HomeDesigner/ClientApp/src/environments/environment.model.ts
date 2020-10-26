import { CloudinaryConfiguration } from '@cloudinary/angular-5.x';

export interface IEnvironment
{
	production: boolean;
	apiUrl: string;
	cloudinary: CloudinaryConfiguration;
	alphavision: { builderId: string };
}
