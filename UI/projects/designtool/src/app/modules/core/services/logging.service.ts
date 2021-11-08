import { Injectable, ErrorHandler } from '@angular/core';

import { ApplicationInsights } from '@microsoft/applicationinsights-web';

@Injectable()
export class LoggingService
{
	

	constructor(private appInsights: ApplicationInsights)
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
