import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { APP_BASE_HREF, PlatformLocation } from "@angular/common";

import { CoreModule } from './modules/core/core.module';
import { NationalModule } from './modules/national/national.module';
import { DivisionalModule } from './modules/divisional/divisional.module';
import { CommunityModule } from './modules/community/community.module';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';

import { IdentityService, PhdCommonModule, AUTH_CONFIG } from 'phd-common';
import { environment } from '../environments/environment';
import { tap } from 'rxjs/operators';

import { Cloudinary as CloudinaryCore } from 'cloudinary-core';
import { CloudinaryConfiguration, CloudinaryModule } from '@cloudinary/angular-5.x';
export const cloudinary = { Cloudinary: CloudinaryCore };
export const config: CloudinaryConfiguration = environment.cloudinary;

const appInitializerFn = (identityService: IdentityService) =>
{
	// the APP_INITIALIZER provider waits for promises to be resolved
	return () => identityService.init().pipe(
		tap(loggedIn =>
		{
			if (!loggedIn)
			{
				identityService.login();
			}
		})
	).toPromise();
};

const appRoutes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'national' },
    { path: 'national', component: NationalModule },
    { path: 'divisional', component: DivisionalModule },
    { path: 'community', component: CommunityModule }
];

export function getBaseHref(platformLocation: PlatformLocation): string
{
	return platformLocation.getBaseHrefFromDOM();
}

@NgModule({
	declarations: [
        AppComponent
	],
	imports: [
        BrowserAnimationsModule,
		NgbModule,
		BrowserModule,
        FormsModule,
		ReactiveFormsModule,
		PhdCommonModule.forRoot(environment.apiUrl),
        CoreModule,
        NationalModule,
        DivisionalModule,
        CommunityModule,
		RouterModule.forRoot(appRoutes),
		CloudinaryModule.forRoot(cloudinary, config)
	],
	providers: [
		{ provide: APP_INITIALIZER, useFactory: appInitializerFn, deps: [IdentityService], multi: true },
		{ provide: APP_BASE_HREF, useFactory: getBaseHref, deps: [PlatformLocation] },
		{ provide: AUTH_CONFIG, useValue: environment.authConfig }
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
