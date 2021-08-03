// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
    production: false,
	apiUrl: 'https://phdapi.qa.pulte.com/odata/',
	hubUrl: 'https://phdhub.qa.pulte.com/hub',
	alphaVisionBuilderGuid: '8D676CB9-C011-429D-8D71-87D34A87494B',
    tenant: "pulte.onmicrosoft.com",
    clientId: "9d433c6a-9bfc-4d5e-917b-3bfe08942b6e",
	authConfig: {
		issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
		clientId: "90bf975f-6a55-42cb-9016-1103586c8f50",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://90bf975f-6a55-42cb-9016-1103586c8f50/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
    appInsights: {
        instrumentationKey: '59530951-22f6-449f-ac70-8dffc824b34d'
	},
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	}
};
