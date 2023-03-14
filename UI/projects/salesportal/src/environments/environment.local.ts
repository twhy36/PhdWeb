import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
	apiUrl: 'http://localhost:2845/odata/',
	authQueryParams: "domain_hint=pulte.com",
	baseUrl: {
		colorManagement: 'http://localhost:14770/',
		buyerTracker: 'http://buyertracker.dev.pulte.com/',
		choiceAdmin: 'http://localhost:14765/',
		crm: 'https://pultedev.crm.dynamics.com/main.aspx?appid=c865bf67-a0e6-e811-a962-000d3a32ce3b',
		salesAdmin: 'http://localhost:14768/ ',
		designTool: 'http://localhost:14767/',
		designPreview: {
			pulte: 'http://localhost:14769/',
			delWebb: 'http://localhost:14769/',
			americanWest: 'http://localhost:14769/',
			diVosta: 'http://localhost:14769/',	
			centex: 'http://localhost:14769/',
			johnWieland: 'http://localhost:14769/',
		},
		thoPreview: {
			pulte: 'https://tho.dev.pulte.com/',
			delWebb: 'https://tho.dev.delwebb.com/',
			americanWest: 'https://tho.dev.americanwesthomes.com/',
			diVosta: 'https://tho.dev.divosta.com/',
			centex: 'https://tho.dev.centex.com/',
			johnWieland: 'https://tho.dev.jwhomes.com/',
		},
		reports: 'http://powerbi.dev.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.dev.pulte.com/HomeSelections/',
		salesTally: 'https://salesportal.dev.pulte.com/salesportal/salestally'
	},
	appInsights: {
		instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0',
		enableAutoRouteTracking: true
	},

	production: false,
	authConfig: {
		issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
		clientId: "d6079aab-8c1d-40e7-81fb-78bda38faea2",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://d6079aab-8c1d-40e7-81fb-78bda38faea2/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	}
};
