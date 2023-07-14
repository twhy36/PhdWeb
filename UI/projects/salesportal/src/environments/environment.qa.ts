import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
	apiUrl: 'https://phdapi.qa.pulte.com/odata/',
	authQueryParams: 'domain_hint=pulte.com',
	baseUrl: {
		colorManagement: 'https://phd.qa.pulte.com/colormanagement/',
		buyerTracker: 'http://buyertracker.qa.pulte.com/',
		choiceAdmin: 'https://phd.qa.pulte.com/choiceadmin/',
		crm: 'https://pulteqa.crm.dynamics.com/Apps/uniquename/pulte_Sales',
		salesAdmin: 'https://phd.qa.pulte.com/salesadmin/',
		designTool: 'https://phd.qa.pulte.com/designtool/',
		designPreview: {
			pulte: 'https://phd.qa.pulte.com/designpreview/',
			delWebb: 'https://phd.qa.delwebb.com/designpreview/',
			americanWest: 'https://phd.qa.americanwesthomes.com/designpreview/',
			diVosta: 'https://phd.qa.divosta.com/designpreview/',
			centex: 'https://phd.qa.centex.com/designpreview/',
			johnWieland: 'https://phd.qa.jwhomes.com/designpreview/',
		},
		thoPreview: {
			pulte: 'https://tho.qa.pulte.com/',
			delWebb: 'https://tho.qa.delwebb.com/',
			americanWest: 'https://tho.qa.americanwesthomes.com/',
			diVosta: 'https://tho.qa.divosta.com/',
			centex: 'https://tho.qa.centex.com/',
			johnWieland: 'https://tho.qa.jwhomes.com/',
		},
		reports: 'http://powerbi.qa.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.qa.pulte.com/HomeSelections/',
		salesTally: 'https://salesportal.qa.pulte.com/salesportal/salestally'
	},
	appInsights: {
		connectionString: 'InstrumentationKey=59530951-22f6-449f-ac70-8dffc824b34d;IngestionEndpoint=https://eastus-5.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/',
		enableAutoRouteTracking: true
	},
	production: false,
	authConfig: {
		issuer: 'https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0',
		clientId: '90bf975f-6a55-42cb-9016-1103586c8f50',
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
