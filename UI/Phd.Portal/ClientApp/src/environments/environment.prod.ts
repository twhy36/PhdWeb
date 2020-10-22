import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
    apiUrl: 'https://phdapi.pulte.com/odata/',
    authQueryParams: "domain_hint=pulte.com",
    baseUrl: {
        buyerTracker: 'http://buyertracker.pulte.com/',
        choiceAdmin: 'https://phd.pulte.com/choiceadmin/',
        crm: 'https://pulte.crm.dynamics.com/main.aspx?appid=9b2076c5-b1d3-41e7-8b71-0115e952d2ac',
        salesAdmin: 'https://phd.pulte.com/salesadmin/',
		designTool: 'https://phd.pulte.com/designtool/',
		reports: 'http://powerbi.pulte.com/Reports/browse/IDEA/Sales/PHD',
		homeSelections: 'https://homebuilder.pulte.com/HomeSelections/',
		salesTally: 'http://powerbi.pulte.com/Reports/browse/SalesTally'
    },
    appInsights: {
        instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
    },
    clientId: "d21266c1-108b-4141-8200-fffa205f205e",
    production: true,
    tenant: "pulte.onmicrosoft.com",
    whatFix: {
        scriptUrl: '//cdn.whatfix.com/prod/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
    }
};
