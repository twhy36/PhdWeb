export const environment = {
	production: true,
	apiUrl: 'https://phdapi.pulte.com/odata/',
	hubUrl: 'https://phdhub.pulte.com/hub',
	alphaVisionBuilderGuid: '8D676CB9-C011-429D-8D71-87D34A87494B',
	tenant: "pulte.onmicrosoft.com",
	clientId: "d21266c1-108b-4141-8200-fffa205f205e",
	authConfig: {
		issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
		clientId: "a008a74f-c4b6-4208-a0bd-ff115d5820a6",
		responseType: 'code',
		clearHashAfterLogin: true,
		requestAccessToken: true,
		scope: 'api://a008a74f-c4b6-4208-a0bd-ff115d5820a6/user_impersonation profile openid',
		showDebugInformation: true,
		skipIssuerCheck: false,
		strictDiscoveryDocumentValidation: false
	},
	appInsights: {
		instrumentationKey: '3080202e-6c69-4829-ad05-f232fe7c4090'
	},
	whatFix: {
		scriptUrl: '//cdn.whatfix.com/prod/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	}
};
