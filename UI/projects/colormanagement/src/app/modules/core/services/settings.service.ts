import { Injectable } from '@angular/core';

import { Settings } from '../../shared/models/settings.model';

@Injectable()
export class SettingsService {
	constructor() {}

	private _cachedSettings: Settings;

	public getSettings(): Settings {
		if (this._cachedSettings == null) {
			let settings: Settings = {
				infiniteScrollThrottle: 50,
				infiniteScrollPageSize: 50,
			};

			this._cachedSettings = settings;
		}

		return this._cachedSettings;
	}
}
