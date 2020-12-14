import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	production: true,
	apiUrl: 'https://phdapi.qa.pulte.com/odata/',
	tenant: "pulte.onmicrosoft.com",
	clientId: "9d433c6a-9bfc-4d5e-917b-3bfe08942b6e",
	authQueryParams: "domain_hint=pulte.com",
	appInsights: {
		instrumentationKey: '59530951-22f6-449f-ac70-8dffc824b34d'
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	}
};
