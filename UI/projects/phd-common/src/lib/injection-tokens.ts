import { InjectionToken } from '@angular/core';
import { AuthConfig } from 'angular-oauth2-oidc';

export const API_URL = new InjectionToken<string>('apiUrl');
export const AUTH_CONFIG = new InjectionToken<AuthConfig>('authConfig');
export const WINDOW_ORIGIN = new InjectionToken<string>('origin');
