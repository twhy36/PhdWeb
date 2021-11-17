import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthConfig } from 'angular-oauth2-oidc';

export const API_URL = new InjectionToken<string>('apiUrl');
export const AUTH_CONFIG = new InjectionToken<AuthConfig | Observable<AuthConfig>>('authConfig');
export const WINDOW_ORIGIN = new InjectionToken<string>('origin');
