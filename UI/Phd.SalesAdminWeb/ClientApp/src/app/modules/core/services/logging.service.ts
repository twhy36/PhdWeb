import { Injectable, Injector, ErrorHandler } from '@angular/core';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';

import { AppInsights } from "applicationinsights-js";

import { AdalService } from 'adal-angular4';

import { SettingsService } from "./settings.service";

import { Settings } from '../../shared/models/settings.model';

@Injectable()
export class LoggingService
{
	private config: Microsoft.ApplicationInsights.IConfig;
	private adalService: AdalService;

	constructor(private settingsService: SettingsService, private injector: Injector)
	{
		this.config = {
			instrumentationKey: this.settingsService.getSettings().appInsightsKey
		};
		this.adalService = this.injector.get("AdalService") as AdalService;

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
