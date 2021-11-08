export const environment = {
	production: true,
	apiUrl: 'https://phdapi.pulte.com/odata/',
	hubUrl: 'https://phdhub.pulte.com/hub',
	thoUrl: 'https://tho.centex.com/',
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
		instrumentationKey: 'f6f360eb-b343-428f-ab2b-c53d417f272e',
		enableAutoRouteTracking: true
	},
	whatFix: {
		scriptUrl: '//cdn.whatfix.com/prod/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	designPreviewMarketWhitelist: [
		460, // Arizona
		465, // New Mexico
		473, // Las Vegas
		448, // Pacific Northwest
		122, // Northern California
		151  // Southern California
	],
	salesAdminFinancialCommunityWhitelist: [
		18323, // 540 West
		14603 // Kingfield
	],
	salesAdminMarketWhitelist: [
		104, // Houston
		110 // Raleigh
	]
};
