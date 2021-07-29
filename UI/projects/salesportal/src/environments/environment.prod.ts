import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
    apiUrl: 'https://phdapi.pulte.com/odata/',
    authQueryParams: "domain_hint=pulte.com",
    baseUrl: {
		colorManagement: 'http://colormanagement.pulte.com/',
        buyerTracker: 'http://buyertracker.pulte.com/',
        choiceAdmin: 'https://phd.pulte.com/choiceadmin/',
        crm: 'https://pulte.crm.dynamics.com/main.aspx?appid=9b2076c5-b1d3-41e7-8b71-0115e952d2ac',
        salesAdmin: 'https://phd.pulte.com/salesadmin/',
		designTool: 'https://phd.pulte.com/designtool/',
		reports: 'http://powerbi.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.pulte.com/HomeSelections/',
		salesTally: 'https://salesportal.pulte.com/salesportal/salestally'
    },
    appInsights: {
        instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
    },
	production: true,
	authConfig: {
		issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
		clientId: "a008a74f-c4b6-4208-a0bd-ff115d5820a6",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://a008a74f-c4b6-4208-a0bd-ff115d5820a6/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
    whatFix: {
        scriptUrl: '//cdn.whatfix.com/prod/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
    }
};
