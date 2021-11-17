import { Injectable, Injector, ErrorHandler } from '@angular/core';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';

import { AppInsights } from "applicationinsights-js";

import { SettingsService } from "./settings.service";

import { IdentityService } from 'phd-common';

@Injectable()
export class LoggingService
{
	private config: Microsoft.ApplicationInsights.IConfig;

	constructor(private settingsService: SettingsService, private injector: Injector, private identityService: IdentityService)
	{
		this.config = {
			instrumentationKey: this.settingsService.getSettings().appInsightsKey
		};

		AppInsights.downloadAndSetup(this.config);

		this.identityService.user.subscribe(u => {
			if (u) {
				AppInsights.setAuthenticatedUserContext(u.upn);
			} else {
				AppInsights.clearAuthenticatedUserContext();
			}
		});
	}

	logError(error: Error)
	{
		const location = this.injector.get(LocationStrategy);
		const message = error.message ? error.message : error.toString();
		const url = location instanceof PathLocationStrategy ? location.path() : '';

		AppInsights.trackException(error, url, { message: message, stack: error.stack });
	}

	logEvent(message: string)
	{
		AppInsights.trackEvent(message);
	}

	logPageView(name?: string, url?: string, properties?: any, measurements?: any, duration?: number)
	{
		AppInsights.trackPageView(name, url, properties, measurements, duration);
	}
}

@Injectable()
export class PhdErrorHandler implements ErrorHandler
{
	constructor(private loggingService: LoggingService) { }

	handleError(error)
	{
		this.loggingService.logError(error);

		console.error(error);
	}
}
