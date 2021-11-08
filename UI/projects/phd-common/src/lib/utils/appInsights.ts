import { InjectionToken } from '@angular/core';
import { IConfiguration, IConfig, ApplicationInsights, ITelemetryItem } from '@microsoft/applicationinsights-web';

export type TelemetryInitializer = (item: ITelemetryItem) => boolean | void;
export const TELEMETRY_INIT = new InjectionToken<TelemetryInitializer>('telemetryInit');

export function initAppInsights(config: IConfiguration & IConfig, telemetryInit?: TelemetryInitializer | TelemetryInitializer[]) {
	const appInsights = new ApplicationInsights({ config });
	appInsights.loadAppInsights();

	if (telemetryInit)
	{
        if (Array.isArray(telemetryInit))
        {
		    telemetryInit.forEach(initializer => appInsights.addTelemetryInitializer(initializer));
        }
        else 
        {
            appInsights.addTelemetryInitializer(telemetryInit);
        }
    }

	return appInsights;
}

export function setClientApp(clientApp: string): TelemetryInitializer
{
    return (item) => 
    {
        if (item && item.baseData && item.baseData.properties)
        {
            item.baseData.properties["ClientApp"] = clientApp;
        }
    }
}