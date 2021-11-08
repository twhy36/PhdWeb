import { Injectable, Injector, ErrorHandler } from '@angular/core';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';

import { ApplicationInsights } from "@microsoft/applicationinsights-web";

import { SettingsService } from "./settings.service";

import { IdentityService } from 'phd-common';

@Injectable()
export class LoggingService
{
	constructor(private appInsights: ApplicationInsights, private injector: Injector)
	{
	}

	logError(error: Error)
	{
		this.appInsights.trackException({error});
	}

	logEvent(message: string)
	{
		this.appInsights.trackEvent({name: message});
	}

	logPageView(name?: string, uri?: string, properties?: any, measurements?: any, duration?: number)
	{
		if (!!duration)
		{
			this.appInsights.trackPageViewPerformance({name, uri, properties: {...properties, ...measurements}, duration: ''+duration});
		}
		else 
		{
			this.appInsights.trackPageView({name, uri, properties: {...properties, ...measurements }});
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
