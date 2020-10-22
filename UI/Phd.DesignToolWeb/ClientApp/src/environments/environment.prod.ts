import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
    production: true,
	apiUrl: 'https://phdapi.pulte.com/odata/',
	hubUrl: 'https://phdhub.pulte.com/hub',
    tenant: "pulte.onmicrosoft.com",
	clientId: "d21266c1-108b-4141-8200-fffa205f205e",
    authQueryParams: "domain_hint=pulte.com",
    appInsights: {
		instrumentationKey: 'f6f360eb-b343-428f-ab2b-c53d417f272e'
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	},
	pdfViewerBaseUrl: 'assets/pdfjs-dist/web/viewer.html',
	whatFix: {
		scriptUrl: '//cdn.whatfix.com/prod/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	EBillUrl: 'https://www.e-billexpress.com/ebpp/PulteGroup/'
};
