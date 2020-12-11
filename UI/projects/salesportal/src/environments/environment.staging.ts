import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
    apiUrl: 'https://phdapi.staging.pulte.com/odata/',
    authQueryParams: "domain_hint=pulte.com",
    baseUrl: {
        buyerTracker: 'http://buyertracker.staging.pulte.com/',
        choiceAdmin: 'https://phd.staging.pulte.com/choiceadmin/',
        crm: 'https://pultestaging.crm.dynamics.com/main.aspx?appid=baecb5e8-6cd0-4f19-b41e-219074220427',
        salesAdmin: 'https://phd.staging.pulte.com/salesadmin/',
		designTool: 'https://phd.staging.pulte.com/designtool/',
		reports: 'http://powerbi.staging.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.staging.pulte.com/HomeSelections/',
		salesTally: 'https://phd.staging.pulte.com/salesportal/salestally'
    },
    appInsights: {
        instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
    },
	production: false,
	authConfig: null,
    whatFix: {
        scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
    }
};
