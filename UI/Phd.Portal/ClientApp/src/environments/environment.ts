import { IEnvironment } from './environment.model';
import { AppInsights } from 'applicationinsights-js';

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
		salesTally: 'https://phddev.azurewebsites.net/salesportal/salestally'
	},
	appInsights: {
		instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
	},
	msalConfig: {
		auth: {
			authority: 'https://login.microsoftonline.com/pulte.onmicrosoft.com',
			clientId: "9d498056-e6cd-4e53-b89b-cf2f5e60adf7",
			validateAuthority: true,
			redirectUri: window.location.origin,
			navigateToLoginRequestUrl: true
		},
		cache: {
			cacheLocation: 'localStorage',
			storeAuthStateInCookie: true
		},
		system: {
			logger: <any>{
				info: (message) => AppInsights.trackTrace(message, { source: 'msal.js' }, 1),
				verbose: (message) => AppInsights.trackTrace(message, { source: 'msal.js' }, 0),
				error: (message) => AppInsights.trackTrace(message, { source: 'msal.js' }, 3),
				errorPii: (message) => AppInsights.trackTrace(message, { source: 'msal.js' }, 3),
				infoPii: (message) => AppInsights.trackTrace(message, { source: 'msal.js' }, 1),
				verbosePii: (message) => AppInsights.trackTrace(message, { source: 'msal.js' }, 0),
				isPiiLoggingEnabled: () => true
			}
		}
	},
	production: false,
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	}
};
