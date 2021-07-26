import { IEnvironment } from './environment.model';

// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment: IEnvironment = {
    production: false,
	tenant: 'pulte.onmicrosoft.com',
	authConfig: {
		issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
		clientId: 'f9c9611d-6a23-4d2e-8dce-14da56bd8acc',
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://f9c9611d-6a23-4d2e-8dce-14da56bd8acc/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
	authQueryParams: 'domain_hint=pulte.com',
    pictureParkAssetUrl: 'https://pultegroup.picturepark.com/Website/Publisher.aspx?Page=AssetConnector',
    appInsights: {
        instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
	},
	cloudinary: { cloud_name: 'dv0jqjrc3', responsive_use_breakpoints: false },
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	apiUrl: 'https://phdapi.dev.pulte.com/odata/',
	designToolUrl: 'https://phd.dev.pulte.com/designtool/',
	designPreviewUrl: 'https://phd.dev.pulte.com/homedesigner/'
};
