import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	production: true,
	apiUrl: 'https://phdapi.pulte.com/odata/',
	authConfigs: {
		sitecoreSSO:
		{
			issuer: 'https://pultesso.pulte.com',
			clientId: 'DesignPreview',
			responseType: 'code',
			clearHashAfterLogin: true,
			scope: 'openid offline_access pulte designpreview.access',
			showDebugInformation: true,
			logoutUrl: 'https://www.pulte.com/My-Pulte-Account/Login'
		},
		azureAD: {
			issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
			clientId: "a008a74f-c4b6-4208-a0bd-ff115d5820a6",
			responseType: 'code',
			clearHashAfterLogin: true,
			requestAccessToken: true,
			scope: 'api://a008a74f-c4b6-4208-a0bd-ff115d5820a6/user_impersonation profile openid',
			showDebugInformation: true,
			skipIssuerCheck: false,
			strictDiscoveryDocumentValidation: false
		}
	},
	authQueryParams: "domain_hint=pulte.com",
	appInsights: {
		instrumentationKey: 'f6f360eb-b343-428f-ab2b-c53d417f272e',
		enableAutoRouteTracking: true
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	},
	pdfViewerBaseUrl: 'assets/pdfjs-dist/web/viewer.html',
	brandMap: {
		pulte: 'phd.pulte.com',
		delwebb: 'phd.delwebb.com',
		americanWest: 'phd.americanwesthomes.com',
		divosta: '',
		johnWieland: ''
	},
	adobeUrl: 'https://assets.adobedtm.com/73ef53bd253f/c533c20a08e9/launch-3b8029c3091a.min.js',
	brandLogoutMap: {
		pulte: 'https://www.pulte.com/My-Pulte-Account/Login',
		delwebb: 'https://www.delwebb.com/My-Del-Webb-Account/Login',
		americanWest: 'https://www.americanwesthomes.com/My-American-West-Account/Login',
		divosta: 'https://www.divosta.com/My-DiVosta-Account/Login',
		johnWieland: 'https://www.jwhomes.com/My-JW-Account/Login'
	}
};
