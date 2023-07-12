import { IEnvironment } from './environment.model';

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment: IEnvironment = {
	production: false,
	apiUrl: 'https://phdapi.dev.pulte.com/odata/',
	authConfigs: {
		sitecoreSSO:
		{
			issuer: 'https://pultessok.dev.pulte.com',
			clientId: 'DesignPreview',
			responseType: 'code',
			clearHashAfterLogin: true,
			requestAccessToken: true,
			scope: 'openid offline_access pulte designpreview.access',
			showDebugInformation: true,
			logoutUrl: 'https://cdr3.dev.pulte.com/My-Pulte-Account/Login'
		},
		azureAD:
		{
			issuer: 'https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0',
			clientId: 'f9c9611d-6a23-4d2e-8dce-14da56bd8acc',
			responseType: 'code',
			clearHashAfterLogin: true,
			requestAccessToken: true,
			scope: 'api://f9c9611d-6a23-4d2e-8dce-14da56bd8acc/user_impersonation profile openid',
			showDebugInformation: true,
			skipIssuerCheck: false,
			strictDiscoveryDocumentValidation: false
		},
		presale: {
			issuer: 'https://phdapi.dev.pulte.com',
		}
	},
	authQueryParams: 'domain_hint=pulte.com',
	appInsights: {
		connectionString: 'InstrumentationKey=08875504-9c0f-45a6-8cc5-8a819e51aff0;IngestionEndpoint=https://eastus-6.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/',
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
		pulte: 'phd.dev.pulte.com',
		delwebb: 'phd.dev.delwebb.com',
		americanWest: 'phd.dev.americanwesthomes.com',
		divosta: 'phd.dev.divosta.com',
		centex: 'phd.dev.centex.com',
		johnWieland: 'phd.dev.jwhomes.com'
	},
	adobeUrl: 'https://assets.adobedtm.com/73ef53bd253f/c533c20a08e9/launch-08a9cce44e7a-development.min.js',
	brandLogoutMap: {
		pulte: 'https://cdr3.dev.pulte.com/My-Pulte-Account/Login',
		delwebb: 'https://cdr3.dev.delwebb.com/My-Del-Webb-Account/Login',
		americanWest: 'https://cdr3.dev.americanwesthomes.com/My-American-West-Account/Login',
		divosta: 'https://cdr3.dev.divosta.com/My-DiVosta-Account/Login',
		johnWieland: 'https://cdr3.dev.jwhomes.com/My-JW-Account/Login',
		centex: 'https://cdr3.dev.centex.com/My-Centex-Account/Login'
	}
};
