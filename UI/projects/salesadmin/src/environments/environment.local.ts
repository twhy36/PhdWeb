// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
	production: false,
	apiUrl: 'http://localhost:2845/odata/',
	hubUrl: 'http://localhost:5000/hub',
	thoUrl: 'http://localhost:4001/',
	alphaVisionBuilderGuid: '8D676CB9-C011-429D-8D71-87D34A87494B',
	tenant: "pulte.onmicrosoft.com",
	clientId: "9d498056-e6cd-4e53-b89b-cf2f5e60adf7",
	authConfig: {
		issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
		clientId: "d6079aab-8c1d-40e7-81fb-78bda38faea2",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://d6079aab-8c1d-40e7-81fb-78bda38faea2/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
	appInsights: {
		instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0',
		enableAutoRouteTracking: true
	},
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	selectedCommunityWhitelist: []
};
