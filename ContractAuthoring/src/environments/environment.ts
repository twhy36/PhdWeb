// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
    production: false,
    apiUrl: 'https://phdapi.dev.pulte.com/odata/',
    config: {
        tenant: 'pulte.onmicrosoft.com',
        clientId: '9d498056-e6cd-4e53-b89b-cf2f5e60adf7'
    },
    appInsights: {
        instrumentationKey: '08875504-9c0f-45a6-8cc5-8a819e51aff0'
    },
};
