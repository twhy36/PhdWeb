import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	production: false,
	apiUrl: 'https://phdapi.qa.pulte.com/odata/',
	authConfigs: {
		sitecoreSSO:
		{
			issuer: 'https://pultesso.qa.pulte.com',
			clientId: 'DesignPreview',
			responseType: 'code',
			clearHashAfterLogin: true,
			scope: 'openid offline_access pulte designpreview.access',
			showDebugInformation: true,
			logoutUrl: 'https://cdr.qa.pulte.com/My-Pulte-Account/Login'
		},
		azureAD: {
			issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
			clientId: "90bf975f-6a55-42cb-9016-1103586c8f50",
			responseType: 'code',
			clearHashAfterLogin: true,
			requestAccessToken: true,
			scope: 'api://90bf975f-6a55-42cb-9016-1103586c8f50/user_impersonation profile openid',
			showDebugInformation: true,
			skipIssuerCheck: false,
			strictDiscoveryDocumentValidation: false
		}
	},
	authQueryParams: "domain_hint=pulte.com",
	appInsights: {
		instrumentationKey: '59530951-22f6-449f-ac70-8dffc824b34d',
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
