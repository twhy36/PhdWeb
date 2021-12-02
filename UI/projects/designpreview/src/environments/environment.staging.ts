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
			issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
			clientId: "7d88528c-ab8d-4757-8b17-e7bc1b84ca15",
			responseType: 'code',
			clearHashAfterLogin: true,
			requestAccessToken: true,
			scope: 'api://7d88528c-ab8d-4757-8b17-e7bc1b84ca15/user_impersonation profile openid',
			showDebugInformation: true,
			skipIssuerCheck: false,
			strictDiscoveryDocumentValidation: false
		}
	},
	authQueryParams: "domain_hint=pulte.com",
	appInsights: {
		instrumentationKey: 'cf19cbb8-e39b-4e28-8199-3d06eaf051f0',
		enableAutoRouteTracking: true
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	},
	pdfViewerBaseUrl: 'assets/pdfjs-dist/web/viewer.html',
	brandMap: {
		pulte: '',
		centex: '',
		delwebb: ''
	}
};
