import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
	apiUrl: 'https://phdapi.dev.pulte.com/odata/',
	//apiUrl: 'http://localhost:2845/odata/',
	authQueryParams: "domain_hint=pulte.com",
	baseUrl: {
		buyerTracker: 'http://buyertracker.dev.pulte.com/',
		choiceAdmin: 'https://phd.dev.pulte.com/choiceadmin/',
		crm: 'https://pultedev.crm.dynamics.com/main.aspx?appid=c865bf67-a0e6-e811-a962-000d3a32ce3b',
		salesAdmin: 'https://phd.dev.pulte.com/salesadmin/',
		designTool: 'https://phd.dev.pulte.com/designtool/',
		reports: 'http://powerbi.dev.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.dev.pulte.com/HomeSelections/',
		salesTally: 'https://phd.dev.pulte.com/salesportal/salestally'
	},
	appInsights: {
		instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
	},
	
	production: false,
	authConfig: {
		issuer: "https://login.microsoftonline.com/pulte.onmicrosoft.com",
		clientId: "f9c9611d-6a23-4d2e-8dce-14da56bd8acc",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'user.read openid',
		showDebugInformation: true,
		skipIssuerCheck: true,
		strictDiscoveryDocumentValidation: false
	},
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	}
};
