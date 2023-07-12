// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	production: false,
	tenant: 'pulte.onmicrosoft.com',
	authConfig: {
		issuer: 'https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0',
		clientId: '7d88528c-ab8d-4757-8b17-e7bc1b84ca15',
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://7d88528c-ab8d-4757-8b17-e7bc1b84ca15/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
	authQueryParams: 'domain_hint=pulte.com',
	pictureParkAssetUrl: 'https://pultegroup.picturepark.com/Website/Publisher.aspx?Page=AssetConnector',
	appInsights: {
		connectionString: 'InstrumentationKey=858d9527-b103-4d11-86b2-4d3db2e630c1;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com/;LiveEndpoint=https://westus.livediagnostics.monitor.azure.com/',
		enableAutoRouteTracking: true
	},
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	apiUrl: 'https://phdapi.staging.pulte.com/odata/',
	designToolUrl: 'https://phd.staging.pulte.com/designtool/',
	designPreviewUrls: {
		pulte: 'https://phd.staging.pulte.com/designpreview/',
		delWebb: 'https://phd.staging.delwebb.com/designpreview/',
		americanWest: 'https://phd.staging.americanwesthomes.com/designpreview/',
		diVosta: 'https://phd.staging.divosta.com/designpreview/',
		centex: 'https://phd.staging.centex.com/designpreview/',
		johnWieland: 'https://phd.staging.jwhomes.com/designpreview/',
	},
	colorManagementUrl: 'https://phd.staging.pulte.com/colormanagement/'
};
