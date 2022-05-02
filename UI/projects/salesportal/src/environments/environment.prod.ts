import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
    apiUrl: 'https://phdapi.pulte.com/odata/',
    authQueryParams: "domain_hint=pulte.com",
    baseUrl: {
		colorManagement: 'https://phd.pulte.com/colormanagement/',
        buyerTracker: 'http://buyertracker.pulte.com/',
        choiceAdmin: 'https://phd.pulte.com/choiceadmin/',
        crm: 'https://pulte.crm.dynamics.com/main.aspx?appid=9b2076c5-b1d3-41e7-8b71-0115e952d2ac',
        salesAdmin: 'https://phd.pulte.com/salesadmin/',
		designTool: 'https://phd.pulte.com/designtool/',
		designPreview: {
			pulte: 'https://phd.pulte.com/designpreview/',
			delWebb: 'https://phd.delwebb.com/designpreview/',
			americanWest: 'https://phd.americanwesthomes.com/designpreview/',
			diVosta: 'https://phd.divosta.com/designpreview/',
			centex: 'https://phd.centex.com/designpreview/',
			johnWieland: 'https://phd.jwhomes.com/designpreview/',
		},
		thoPreview: 'https://tho.centex.com/',
		reports: 'http://powerbi.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.pulte.com/HomeSelections/',
		salesTally: 'https://salesportal.pulte.com/salesportal/salestally'
    },
    appInsights: {
        instrumentationKey: 'f6f360eb-b343-428f-ab2b-c53d417f272e',
		enableAutoRouteTracking: true
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
