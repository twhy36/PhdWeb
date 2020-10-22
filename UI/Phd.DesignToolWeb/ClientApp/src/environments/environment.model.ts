import { CloudinaryConfiguration } from '@cloudinary/angular-5.x';

export interface IEnvironment
{
	production: boolean;
	apiUrl: string;
	hubUrl: string;
	tenant: string;
	clientId: string;
	authQueryParams: string;
	appInsights: any;
	cloudinary: CloudinaryConfiguration;
	alphavision: { builderId: string };
	pdfViewerBaseUrl: string;
	whatFix: { scriptUrl: string };
	EBillUrl: string;
}
