import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	production: false,
	apiUrl: 'https://phdapi.qa.pulte.com/odata/',
	authConfig: {
		issuer: "https://login.microsoftonline.com/pulte.onmicrosoft.com",
		clientId: "90bf975f-6a55-42cb-9016-1103586c8f50",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'user.read openid',
		showDebugInformation: true,
		skipIssuerCheck: true,
		strictDiscoveryDocumentValidation: false
	},
	authQueryParams: "domain_hint=pulte.com",
	appInsights: {
		instrumentationKey: '59530951-22f6-449f-ac70-8dffc824b34d'
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	}
};
