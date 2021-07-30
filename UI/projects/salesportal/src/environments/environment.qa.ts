import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
    apiUrl: 'https://phdapi.qa.pulte.com/odata/',
    authQueryParams: "domain_hint=pulte.com",
    baseUrl: {
		colorManagement: 'https://phd.qa.pulte.com/colormanagement/',
        buyerTracker: 'http://buyertracker.qa.pulte.com/',
        choiceAdmin: 'https://phd.qa.pulte.com/choiceadmin/',
        crm: 'https://pulteqa.crm.dynamics.com/main.aspx?appid=fd4b6997-db24-46d9-ae08-413c5059fcbe',
        salesAdmin: 'https://phd.qa.pulte.com/salesadmin/',
		designTool: 'https://phd.qa.pulte.com/designtool/',
		reports: 'http://powerbi.qa.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.qa.pulte.com/HomeSelections/',
		salesTally: 'https://salesportal.qa.pulte.com/salesportal/salestally'
    },
    appInsights: {
        instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
    },
	production: false,
	authConfig: {
		issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
		clientId: "90bf975f-6a55-42cb-9016-1103586c8f50",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://90bf975f-6a55-42cb-9016-1103586c8f50/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
    whatFix: {
        scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
    }
};
