// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
    production: false,
    apiUrl: 'https://phdapi.staging.pulte.com/odata/',
    authConfig: {
        issuer: 'https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0',
        clientId: '7d88528c-ab8d-4757-8b17-e7bc1b84ca15',
        responseType: 'code',
        clearHashAfterLogin: false,
        requestAccessToken: true,
        scope: 'api://7d88528c-ab8d-4757-8b17-e7bc1b84ca15/user_impersonation profile openid',
        showDebugInformation: true,
        skipIssuerCheck: false,
        strictDiscoveryDocumentValidation: false
    },
    appInsights: {
        connectionString: 'InstrumentationKey=cf19cbb8-e39b-4e28-8199-3d06eaf051f0;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com/;LiveEndpoint=https://westus.livediagnostics.monitor.azure.com/'
    },
};
