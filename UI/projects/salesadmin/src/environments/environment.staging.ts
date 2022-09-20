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
	selectedCommunityWhitelist: [
		104,
		106,
		107,
		110,
		113,
		114,
		116,
		118,
		122,
		// 123, Cleveland
		124,
		129,
		130,
		140,
		151,
		182,
		448,
		456,
		457,
		458,
		460,
		463,
		464,
		// 465, New Mexico
		// 471, Columbus
		473,
		474,
		479,
		36773,
		38419,
		38519,
		40008,
		41138,
		41141,
		41207,
		41249,
		41262,
		41282,
		41295,
		41315,
		41316,
		41335,
		41364,
		41366,
		41399,
		41470,
		41506,
		41508,
		41510,
		41512,
		41579,
		41597,
		41598,
		41624,
		41637,
		41657,
		41670,
		41686,
		41694,
		41698,
		41699,
		41700,
		41701,
		41717,
		41725,
		41732,
		41734,
		41736,
		41750,
		41758,
		41762,
		41774,
		41776,
		41778,
		41799,
		41816,
		41859,
		41861,
		41863
	],
	designPreviewMarketWhitelist: [
		460, // Arizona Market
		463, // Austin Market
		104, // Houston Market
		473, // Las Vegas Market
		124, // Michigan Market
		465, // New Mexico Market
		122, // Northern California
		40008, // Northeast Florida Market
		448, // Pacific Northwest
		151, // Southern California
	]
};
