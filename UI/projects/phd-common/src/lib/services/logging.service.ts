import { Injectable, Injector, ErrorHandler } from '@angular/core';

import { ApplicationInsights } from '@microsoft/applicationinsights-web';

@Injectable()
export class LoggingService
{
	constructor(private appInsights: ApplicationInsights, private injector: Injector)
	{
	}

	logError(error: Error, props?)
	{
		this.appInsights.trackException({
			exception: error,
			properties: props
		});
	}

	logEvent(message: string)
	{
		this.appInsights.trackEvent({ name: message });
	}

	logPageView(name?: string, uri?: string, properties?: any, measurements?: any, duration?: number)
	{
		if (!!duration)
		{
			this.appInsights.trackPageViewPerformance({ name, uri, properties: { ...properties, ...measurements }, duration: '' + duration });
		}
		else 
		{
			this.appInsights.trackPageView({ name, uri, properties: { ...properties, ...measurements } });
		}
	}
}

@Injectable()
export class PhdErrorHandler implements ErrorHandler
{
	constructor(private loggingService: LoggingService) { }

	handleError(error)
	{
		const properties = {
			FriendlyMessage: 'Application Error'
		};

		this.loggingService.logError(error, properties);

		console.error(error);
	}
}
