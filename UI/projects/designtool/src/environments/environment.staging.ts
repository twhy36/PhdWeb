import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
    production: false,
	apiUrl: 'https://phdapi.staging.pulte.com/odata/',
	hubUrl: 'https://phdhub.staging.pulte.com/hub',
	baseUrl: {
		designPreviewUrls: {
			pulte: 'https://phd.staging.pulte.com/designpreview/',
			delWebb: 'https://phd.staging.delwebb.com/designpreview/',
			americanWest: 'https://phd.staging.americanwesthomes.com/designpreview/',
			diVosta: 'https://phd.staging.divosta.com/designpreview/',
			centex: 'https://phd.staging.centex.com/designpreview/',
			johnWieland: 'https://phd.staging.jwhomes.com/designpreview/',
		},
	},
    tenant: "pulte.onmicrosoft.com",
	clientId: "d6e4e999-c413-4d1d-b0fb-618759cb69e5",
	authConfig: {
		issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
		clientId: "7d88528c-ab8d-4757-8b17-e7bc1b84ca15",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://7d88528c-ab8d-4757-8b17-e7bc1b84ca15/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
    authQueryParams: "domain_hint=pulte.com",
    appInsights: {
		instrumentationKey: 'cf19cbb8-e39b-4e28-8199-3d06eaf051f0',
		enableAutoRouteTracking: true
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	},
	pdfViewerBaseUrl: 'assets/pdfjs-dist/web/viewer.html',
	defaultImageURL: 'assets/PG_Logo_2022_Stacked_Full Color_Padded.png',
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	EBillUrl: 'https://demo.e-billexpress.com/ebpp/PulteGroup/'
};
