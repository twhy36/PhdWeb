import { Injectable } from '@angular/core';

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
                authQueryParams: environment.authQueryParams,
                clientId: environment.authConfig.clientId,
                redirectUrl: '',
				tenant: environment.tenant,
				cacheLocation: 'localStorage',
				expireOffsetSeconds: 0, // 60 minutes.  For testing set to 3480 = 58 min so should time out after 2 minutes
				extraQueryParameter: environment.authQueryParams,
				designToolUrl: environment.designToolUrl,
				designPreviewUrls: environment.designPreviewUrls,
				pictureParkAssetUrl: environment.pictureParkAssetUrl,
				infiniteScrollThrottle: 50,
				infiniteScrollPageSize: 50,
				production: environment.production
            }

			this._cachedSettings = settings;
        }

		return this._cachedSettings;
	}
}
