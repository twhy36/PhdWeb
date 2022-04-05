// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
    production: false,
	apiUrl: 'https://phdapi.staging.pulte.com/odata/',
	hubUrl: 'https://phdhub.staging.pulte.com/hub',
	thoUrl: 'https://tho.staging.centex.com/',
	alphaVisionBuilderGuid: '8D676CB9-C011-429D-8D71-87D34A87494B',
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
    appInsights: {
        instrumentationKey: 'cf19cbb8-e39b-4e28-8199-3d06eaf051f0',
		enableAutoRouteTracking: true
	},
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	designPreviewMarketWhitelist: [
		459, // Arizona Market
		462, // Austin Market
		103, // Houston Market
		472, // Las Vegas Market
		123, // Michigan Market
		464, // New Mexico Market
		121, // Northern California
		112, // North Florida
		447, // Pacific Northwest
		150, // Southern California
	]
};
