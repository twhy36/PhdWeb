import { Injectable, Inject } from '@angular/core';

import { Settings } from '../../shared/models/settings.model';

import { environment } from '../../../../environments/environment';

@Injectable()
export class SettingsService
{
	constructor() { }

	private _cachedSettings: Settings;

	public getSettings(): Settings
	{
		if (this._cachedSettings == null)
        {
            let settings: Settings = {
                apiUrl: environment.apiUrl,
                appInsightsKey: environment.appInsights.instrumentationKey,
                clientId: environment.clientId,
                redirectUrl: '',
				tenant: environment.tenant,
				cacheLocation: 'localStorage',
				expireOffsetSeconds: 900, // 15 minutes.  For testing set to 3480 = 58 min so should time out after 2 minutes
				infiniteScrollThrottle: 50,
				infiniteScrollPageSize: 50
            }

			this._cachedSettings = settings;
        }

		return this._cachedSettings;
	}
}
