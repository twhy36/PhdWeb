import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	production: false,
	apiUrl: 'https://phdapi.staging.pulte.com/odata/',
	authConfigs: null,
	authQueryParams: "domain_hint=pulte.com",
	appInsights: {
		instrumentationKey: 'cf19cbb8-e39b-4e28-8199-3d06eaf051f0'
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	},
	pdfViewerBaseUrl: 'assets/pdfjs-dist/web/viewer.html'
};
