import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	production: true,
	tenant: 'pulte.onmicrosoft.com',
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
	pictureParkAssetUrl: 'https://pultegroup.picturepark.com/Website/Publisher.aspx?Page=AssetConnector',
	appInsights: {
		instrumentationKey: '3080202e-6c69-4829-ad05-f232fe7c4090'
	},
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	},
	apiUrl: 'https://phdapi.pulte.com/odata/',
	designToolUrl: 'https://phd.pulte.com/designtool/',
	designPreviewUrl: 'https://phd.pulte.com/homedesigner/'
};
