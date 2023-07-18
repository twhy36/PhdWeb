export const environment = {
    production: true,
    apiUrl: 'https://phdapi.pulte.com/odata/',
    authConfig: {
        issuer: "https://login.microsoftonline.com/1a9277a3-ef66-41f6-96b5-c5390ee468a7/v2.0",
        clientId: "a008a74f-c4b6-4208-a0bd-ff115d5820a6",
        responseType: 'code',
        clearHashAfterLogin: false,
        requestAccessToken: true,
        scope: 'api://a008a74f-c4b6-4208-a0bd-ff115d5820a6/user_impersonation profile openid',
        showDebugInformation: true,
        skipIssuerCheck: false,
        strictDiscoveryDocumentValidation: false
    },
    appInsights: {
        instrumentationKey: 'f6f360eb-b343-428f-ab2b-c53d417f272e'
    },
};
