import { IEnvironment } from './environment.model';

export const environment: IEnvironment = {
	apiUrl: 'https://phdapi.pulte.com/odata/',
	authQueryParams: 'domain_hint=pulte.com',
	appInsights: {
		connectionString: 'InstrumentationKey=6c8d0c20-dc72-405b-ad70-1afd5aa8820e;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com/;LiveEndpoint=https://westus.livediagnostics.monitor.azure.com/',
		enableAutoRouteTracking: true
	},
	production: true,
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
	whatFix: {
		scriptUrl: '//cdn.whatfix.com/prod/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	}
};
