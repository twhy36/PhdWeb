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
import { PhdCommonModule } from 'phd-common';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';

import { IdentityService } from 'phd-common/services';
import { environment } from 'environments/environment';

const appInitializerFn = (identityService: IdentityService) =>
{
	// the APP_INITIALIZER provider waits for promises to be resolved
	return () => identityService.init().toPromise();
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
		PhdCommonModule.forRoot({
				authQueryParams: environment.authQueryParams,
				clientId: environment.clientId,
				tenant: environment.tenant
			},
			environment.apiUrl
		),
        CoreModule,
        NationalModule,
        DivisionalModule,
        CommunityModule,
		RouterModule.forRoot(appRoutes)
	],
	providers: [
		{ provide: APP_INITIALIZER, useFactory: appInitializerFn, deps: [IdentityService], multi: true },
		{ provide: APP_BASE_HREF, useFactory: getBaseHref, deps: [PlatformLocation] }
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
