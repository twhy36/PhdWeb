import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthConfig } from 'angular-oauth2-oidc';
import { IConfig, IConfiguration } from '@microsoft/applicationinsights-web';
import { Cloudinary } from '@cloudinary/url-gen';

export const API_URL = new InjectionToken<string>('apiUrl');
export const AUTH_CONFIG = new InjectionToken<AuthConfig | Observable<AuthConfig>>('authConfig');
export const WINDOW_ORIGIN = new InjectionToken<string>('origin');
export const APP_INSIGHTS_CONFIG = new InjectionToken<IConfiguration & IConfig>('appInsightsConfig');
export const CLOUDINARY = new InjectionToken<Cloudinary>('cloudinary');
