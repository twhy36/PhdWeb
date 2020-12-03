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
	production: boolean;
	msalConfig: any;
    whatFix: { scriptUrl: string };
};
