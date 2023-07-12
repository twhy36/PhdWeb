import { Injectable } from '@angular/core';
import { Settings } from '../models/settings.model';
import { environment } from '../../environments/environment';

@Injectable()
export class SettingsService
{
    constructor() { }

    private _cachedSettings: Settings;

    public getSettings(): Settings
    {
        if (this._cachedSettings == null)
        {
            const settings: Settings = {
                apiUrl: environment.apiUrl
            }

            this._cachedSettings = settings;
        }

        return this._cachedSettings;
    }
}
