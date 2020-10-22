export interface IEnvironment {
    apiUrl: string;
    authQueryParams: string;
    baseUrl: {
        buyerTracker: string;
        choiceAdmin: string;
        crm: string;
        salesAdmin: string;
		designTool: string;
        reports: string;
		homeSelections: string;
		salesTally: string;
    };
    appInsights: {
        instrumentationKey: string;
    };
    clientId: string;
    production: boolean;
    tenant: string;
    whatFix: { scriptUrl: string };
};
