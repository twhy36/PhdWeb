import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
    production: true,
	apiUrl: 'https://phdapi.pulte.com/odata/',
	hubUrl: 'https://phdhub.pulte.com/hub',
	baseUrl: {
		designPreviewUrls: {
			pulte: 'https://phd.pulte.com/designpreview/',
			delWebb: 'https://phd.delwebb.com/designpreview/',
			americanWest: 'https://phd.americanwesthomes.com/designpreview/',
			diVosta: 'https://phd.divosta.com/designpreview/',
			centex: 'https://phd.centex.com/designpreview/',
			johnWieland: 'https://phd.jwhomes.com/designpreview/',
		},
	},
    tenant: 'pulte.onmicrosoft.com',
	clientId: 'd21266c1-108b-4141-8200-fffa205f205e',
	authConfig: {
		issuer: 'https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0',
		clientId: 'a008a74f-c4b6-4208-a0bd-ff115d5820a6',
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://a008a74f-c4b6-4208-a0bd-ff115d5820a6/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
    authQueryParams: 'domain_hint=pulte.com',
    appInsights: {
		connectionString: 'InstrumentationKey=6c8d0c20-dc72-405b-ad70-1afd5aa8820e;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com/;LiveEndpoint=https://westus.livediagnostics.monitor.azure.com/',
		enableAutoRouteTracking: true
	},
	cloudinary: {
		cloud: { cloudName: 'dv0jqjrc3' }
	},
	alphavision: {
		builderId: '8D676CB9-C011-429D-8D71-87D34A87494B'
	},
	pdfViewerBaseUrl: 'assets/pdfjs-dist/web/viewer.html',
	defaultImageURL: 'assets/PG_Logo_2022_Stacked_Full Color_Padded.png',
	whatFix: {
		scriptUrl: '//cdn.whatfix.com/prod/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	EBillUrl: 'https://www.e-billexpress.com/ebpp/PulteGroup/'
};
