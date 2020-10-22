// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
    production: false,
    apiUrl: 'https://phdapi.qa.pulte.com/odata/',
    config: {
        tenant: 'pulte.onmicrosoft.com',
        clientId: '9d433c6a-9bfc-4d5e-917b-3bfe08942b6e'
    },
    appInsights: {
        instrumentationKey: '59530951-22f6-449f-ac70-8dffc824b34d'
    },
};
