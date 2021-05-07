import { BrowserModule, Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule, Router } from '@angular/router';
import { APP_BASE_HREF, PlatformLocation } from "@angular/common";

import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { Cloudinary } from 'cloudinary-core';
import { ToastrModule } from 'ngx-toastr';
import { Observable, of } from 'rxjs';

import { PhdCommonModule, IdentityService, AUTH_CONFIG } from 'phd-common';

import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { CoreModule } from './modules/core/core.module';
import { StoreModule } from './modules/ngrx-store/store.module';
import { SharedModule } from './modules/shared/shared.module';
import { HomeModule } from './modules/home/home.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AuthService } from './modules/core/services/auth.service';
import { AuthConfigSelector } from './modules/shared/classes/auth-config-selector.class';

const appRoutes: Routes = [
    { path: 'home', component: HomeModule },
	{ path: 'favorites', component: FavoritesModule },
    { path: '', pathMatch: 'full', redirectTo: 'home' }
];

export function getBaseHref(platformLocation: PlatformLocation): string {
	return platformLocation.getBaseHrefFromDOM();
}

const tryInitAuth = (authService: AuthService, identityService: IdentityService) => {
	return () => {
		const params = new URLSearchParams(window.location.search);
		if (params.has('code') && params.has('state') && params.get('state').split(';').length > 1) {
			const additionalState = JSON.parse(decodeURIComponent(params.get('state').split(';')[1]));
			if (additionalState['provider']){
				authService.setAuthConfig(environment.authConfigs[additionalState['provider']]);
			}

			return identityService.init().toPromise();
		}
		return Promise.resolve();
	}
}

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        CommonModule,
		PhdCommonModule.forRoot(environment.apiUrl),
		FormsModule,
		CoreModule,
        SharedModule,
		HomeModule,
		FavoritesModule,
		RouterModule.forRoot(appRoutes),
		StoreModule,
		CloudinaryModule.forRoot({ Cloudinary }, environment.cloudinary),
		ToastrModule.forRoot({ closeButton: true })
    ],
    providers: [
		{ provide: APP_INITIALIZER, useFactory: tryInitAuth, deps: [AuthService, IdentityService], multi: true },
		{ provide: APP_BASE_HREF, useFactory: getBaseHref, deps: [PlatformLocation] },
		{ provide: AUTH_CONFIG, useClass: AuthConfigSelector, deps: [AuthService] }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
