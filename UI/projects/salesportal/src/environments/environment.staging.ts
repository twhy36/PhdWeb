import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
    apiUrl: 'https://phdapi.staging.pulte.com/odata/',
    authQueryParams: "domain_hint=pulte.com",
    baseUrl: {
		colorManagement: 'https://phd.staging.pulte.com/colormanagement/',
        buyerTracker: 'http://buyertracker.staging.pulte.com/',
        choiceAdmin: 'https://phd.staging.pulte.com/choiceadmin/',
        crm: 'https://pultestaging.crm.dynamics.com/main.aspx?appid=baecb5e8-6cd0-4f19-b41e-219074220427',
        salesAdmin: 'https://phd.staging.pulte.com/salesadmin/',
		designTool: 'https://phd.staging.pulte.com/designtool/',
		designPreview: {
			pulte: 'https://phd.staging.pulte.com/designpreview/',
			delWebb: 'https://phd.staging.delwebb.com/designpreview/',
			americanWest: 'https://phd.staging.americanwesthomes.com/designpreview/',
			diVosta: 'https://phd.staging.pulte.com/designpreview/',// CHANGE TO DIVOSTA WHEN READY
			centex: 'https://phd.staging.pulte.com/designpreview/',// CHANGE TO CENTEX WHEN READY
			johnWieland: 'https://phd.staging.pulte.com/designpreview/',// CHANGE TO JOHN-WIELAND WHEN READY
		},
		thoPreview: 'https://tho.staging.centex.com/',
		reports: 'http://powerbi.staging.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.staging.pulte.com/HomeSelections/',
		salesTally: 'https://salesportal.staging.pulte.com/salesportal/salestally'
    },
    appInsights: {
        instrumentationKey: 'cf19cbb8-e39b-4e28-8199-3d06eaf051f0',
		enableAutoRouteTracking: true
    },
	production: false,
	authConfig: {
		issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
		clientId: "7d88528c-ab8d-4757-8b17-e7bc1b84ca15",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://7d88528c-ab8d-4757-8b17-e7bc1b84ca15/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
    whatFix: {
        scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
    }
};
