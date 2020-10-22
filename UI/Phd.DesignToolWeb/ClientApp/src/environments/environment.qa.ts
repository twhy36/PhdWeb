import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
    production: false,
	apiUrl: 'https://phdapi.qa.pulte.com/odata/',
	hubUrl: 'https://phdhub.qa.pulte.com/hub',
    tenant: "pulte.onmicrosoft.com",
	clientId: "9d433c6a-9bfc-4d5e-917b-3bfe08942b6e",
    authQueryParams: "domain_hint=pulte.com",
    appInsights: {
        instrumentationKey: '59530951-22f6-449f-ac70-8dffc824b34d'
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	},
	pdfViewerBaseUrl: 'assets/pdfjs-dist/web/viewer.html',
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	EBillUrl: 'https://demo.e-billexpress.com/ebpp/PulteGroup/'
};
