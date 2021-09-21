import { AuthConfig } from 'angular-oauth2-oidc';
import { CloudinaryConfiguration } from '@cloudinary/angular-5.x';

export interface IEnvironment {
	production: boolean;
	apiUrl: string;
	hubUrl: string;
	thoUrl: string;
	alphaVisionBuilderGuid: string;
	tenant: string;
	clientId: string;
	authConfig: AuthConfig;
	authQueryParams: string;
	appInsights: any;
	cloudinary: CloudinaryConfiguration;
	alphavision: { builderId: string };
	pdfViewerBaseUrl: string;
	whatFix: { scriptUrl: string };
	EBillUrl: string;
	designPreviewMarketWhitelist: number[];
	salesAdminFinancialCommunityWhitelist: number[];
	salesAdminMarketWhitelist: number[];
}
