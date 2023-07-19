import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	production: false,
	apiUrl: 'https://phdapi.staging.pulte.com/odata/',
	authConfigs: {
		sitecoreSSO:
		{
			issuer: 'https://pultesso.staging.pulte.com',
			clientId: 'DesignPreview',
			responseType: 'code',
			clearHashAfterLogin: true,
			scope: 'openid offline_access pulte designpreview.access',
			showDebugInformation: true,
			logoutUrl: 'https://cdr.staging.pulte.com/My-Pulte-Account/Login'
		},
		azureAD: {
			issuer: 'https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0',
			clientId: '7d88528c-ab8d-4757-8b17-e7bc1b84ca15',
			responseType: 'code',
			clearHashAfterLogin: true,
			requestAccessToken: true,
			scope: 'api://7d88528c-ab8d-4757-8b17-e7bc1b84ca15/user_impersonation profile openid',
			showDebugInformation: true,
			skipIssuerCheck: false,
			strictDiscoveryDocumentValidation: false
		},
		presale: {
			issuer: 'https://phdapi.staging.pulte.com',
		}
	},
	authQueryParams: 'domain_hint=pulte.com',
	appInsights: {
		connectionString: 'InstrumentationKey=858d9527-b103-4d11-86b2-4d3db2e630c1;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com/;LiveEndpoint=https://westus.livediagnostics.monitor.azure.com/',
		enableAutoRouteTracking: true
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	},
	pdfViewerBaseUrl: 'assets/pdfjs-dist/web/viewer.html',
	brandMap: {
		pulte: 'phd.staging.pulte.com',
		delwebb: 'phd.staging.delwebb.com',
		americanWest: 'phd.staging.americanwesthomes.com',
		divosta: 'phd.staging.divosta.com',
		centex: 'phd.staging.centex.com',
		johnWieland: 'phd.staging.jwhomes.com'
	},
	adobeUrl: 'https://assets.adobedtm.com/73ef53bd253f/c533c20a08e9/launch-0c0228c569fd-staging.min.js',
	brandLogoutMap: {
		pulte: 'https://cdr.staging.pulte.com/My-Pulte-Account/Login',
		delwebb: 'https://cdr.staging.delwebb.com/My-Del-Webb-Account/Login',
		americanWest: 'https://cdr.staging.americanwesthomes.com/My-American-West-Account/Login',
		divosta: 'https://cdr.staging.divosta.com/My-DiVosta-Account/Login',
		johnWieland: 'https://cdr.staging.jwhomes.com/My-JW-Account/Login',
		centex: 'https://cdr.staging.centex.com/My-Centex-Account/Login'
	}
};
