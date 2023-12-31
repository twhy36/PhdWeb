import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
    apiUrl: 'https://phdapi.qa.pulte.com/odata/',
    authQueryParams: "domain_hint=pulte.com",
    baseUrl: {
        buyerTracker: 'http://buyertracker.qa.pulte.com/',
        choiceAdmin: 'https://phd.qa.pulte.com/choiceadmin/',
        crm: 'https://pulteqa.crm.dynamics.com/main.aspx?appid=fd4b6997-db24-46d9-ae08-413c5059fcbe',
        salesAdmin: 'https://phd.qa.pulte.com/salesadmin/',
		designTool: 'https://phd.qa.pulte.com/designtool/',
		reports: 'http://powerbi.qa.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.qa.pulte.com/HomeSelections/',
		salesTally: 'https://phd.qa.pulte.com/salesportal/salestally'
    },
    clientId: "9d433c6a-9bfc-4d5e-917b-3bfe08942b6e",
    appInsights: {
        instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
    },
    production: false,
    tenant: "pulte.onmicrosoft.com",
    whatFix: {
        scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
    }
};
