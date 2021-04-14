import { Injectable, Injector, ErrorHandler } from '@angular/core';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';

import { IdentityService } from 'phd-common';

import { AppInsights } from "applicationinsights-js";

import { environment } from '../../../../environments/environment';

@Injectable()
export class LoggingService
{
	private config: Microsoft.ApplicationInsights.IConfig;

	constructor(private injector: Injector, private identityService: IdentityService)
	{
		this.config = {
			instrumentationKey: environment.appInsights.instrumentationKey
		};

		this.identityService.user.subscribe(u => {
			if (u) {
				AppInsights.setAuthenticatedUserContext(u.upn);
			} else {
				AppInsights.clearAuthenticatedUserContext();
			}
		});
		
		AppInsights.downloadAndSetup(this.config);
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
