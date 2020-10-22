import { Injectable, Injector, ErrorHandler } from '@angular/core';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';

import { AdalService } from 'adal-angular4';

import { AppInsights } from "applicationinsights-js";

import { environment } from '../../../../environments/environment';

@Injectable()
export class LoggingService
{
	private config: Microsoft.ApplicationInsights.IConfig;
	private adalService: AdalService;

	constructor(private injector: Injector)
	{
		this.config = {
			instrumentationKey: environment.appInsights.instrumentationKey
		};
		this.adalService = this.injector.get('AdalService') as AdalService;

		AppInsights.downloadAndSetup(this.config);
	}

	logError(error: Error)
	{
		this.setUser();

		const location = this.injector.get(LocationStrategy);
		const message = error.message ? error.message : error.toString();
		const url = location instanceof PathLocationStrategy ? location.path() : '';

		AppInsights.trackException(error, url, { message: message, stack: error.stack });
	}

	logEvent(message: string)
	{
		this.setUser();
		AppInsights.trackEvent(message);
	}

	logPageView(name?: string, url?: string, properties?: any, measurements?: any, duration?: number)
	{
		this.setUser();
		AppInsights.trackPageView(name, url, properties, measurements, duration);
	}

	setUser() {
		if (this.adalService.userInfo.authenticated) {
			AppInsights.setAuthenticatedUserContext(this.adalService.userInfo.profile.upn);
		} else {
			AppInsights.clearAuthenticatedUserContext();
		}
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
