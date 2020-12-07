import { IEnvironment } from './environment.model';

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment: IEnvironment = {
	production: false,
	apiUrl: 'https://phdapi.dev.pulte.com/odata/',
	//apiUrl: 'http://localhost:2845/odata/',
	tenant: 'pulte.onmicrosoft.com',
	clientId: '9d498056-e6cd-4e53-b89b-cf2f5e60adf7',
	authQueryParams: 'domain_hint=pulte.com',
	appInsights: {
		instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	}
};
