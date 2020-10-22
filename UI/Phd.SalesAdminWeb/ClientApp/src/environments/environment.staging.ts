// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
    production: false,
    apiUrl: 'https://phdapi.staging.pulte.com/odata/',
    tenant: "pulte.onmicrosoft.com",
    clientId: "d6e4e999-c413-4d1d-b0fb-618759cb69e5",
    authQueryParams: "domain_hint=pulte.com",
    appInsights: {
        instrumentationKey: '6fe29ada-16ba-4d15-b3a8-0364e90c4250'
	},
	whatFix: {
		scriptUrl: '//whatfix.com/01caf5e0-cb2f-11e8-b979-04013d24cd02/embed/embed.nocache.js'
	}
};
