import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	production: false,
	apiUrl: 'https://phdapi.qa.pulte.com/odata/',
	authConfigs: {
		sitecoreSSO:
		{
			issuer: 'https://pultessok.qa.pulte.com',
			clientId: 'DesignPreview',
			responseType: 'code',
			clearHashAfterLogin: true,
			scope: 'openid offline_access pulte designpreview.access',
			showDebugInformation: true,
			logoutUrl: 'https://cdk.qa.pulte.com/My-Pulte-Account/Login'
		},
		azureAD: {
			issuer: 'https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0',
			clientId: '90bf975f-6a55-42cb-9016-1103586c8f50',
			responseType: 'code',
			clearHashAfterLogin: true,
			requestAccessToken: true,
			scope: 'api://90bf975f-6a55-42cb-9016-1103586c8f50/user_impersonation profile openid',
			showDebugInformation: true,
			skipIssuerCheck: false,
			strictDiscoveryDocumentValidation: false
		},
		presale: {
			issuer: 'https://phdapi.qa.pulte.com',
		}
	},
	authQueryParams: 'domain_hint=pulte.com',
	appInsights: {
		connectionString: 'InstrumentationKey=59530951-22f6-449f-ac70-8dffc824b34d;IngestionEndpoint=https://eastus-5.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/',
		enableAutoRouteTracking: false,
		disableExceptionTracking: false,
		disableAjaxTracking: true
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	},
	pdfViewerBaseUrl: 'assets/pdfjs-dist/web/viewer.html',
	brandMap: {
		pulte: 'phd.qa.pulte.com',
		delwebb: 'phd.qa.delwebb.com',
		americanWest: 'phd.qa.americanwesthomes.com',
		divosta: 'phd.qa.divosta.com',
		centex: 'phd.qa.centex.com',
		johnWieland: 'phd.qa.jwhomes.com'
	},
	adobeUrl: 'https://assets.adobedtm.com/73ef53bd253f/c533c20a08e9/launch-08a9cce44e7a-development.min.js',
	brandLogoutMap: {
		pulte: 'https://cdk.qa.pulte.com/My-Pulte-Account/Login',
		delwebb: 'https://cdk.qa.delwebb.com/My-Del-Webb-Account/Login',
		americanWest: 'https://cdk.qa.americanwesthomes.com/My-American-West-Account/Login',
		divosta: 'https://cdk.qa.divosta.com/My-DiVosta-Account/Login',
		johnWieland: 'https://cdk.qa.jwhomes.com/My-JW-Account/Login',
		centex: 'https://cdk.qa.centex.com/My-Centex-Account/Login'
	}
};
