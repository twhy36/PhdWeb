import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
    production: false,
	apiUrl: 'https://phdapi.staging.pulte.com/odata/',
	hubUrl: 'https://phdhub.staging.pulte.com/hub',
    tenant: "pulte.onmicrosoft.com",
    clientId: "d6e4e999-c413-4d1d-b0fb-618759cb69e5",
    authQueryParams: "domain_hint=pulte.com",
    appInsights: {
		instrumentationKey: 'cf19cbb8-e39b-4e28-8199-3d06eaf051f0'
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
