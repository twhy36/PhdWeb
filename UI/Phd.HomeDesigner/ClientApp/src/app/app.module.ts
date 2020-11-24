import { BrowserModule, Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { APP_BASE_HREF, PlatformLocation } from "@angular/common";

import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { Cloudinary } from 'cloudinary-core';

import { PhdCommonModule } from 'phd-common';

import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { CoreModule } from './modules/core/core.module';
import { SharedModule } from './modules/shared/shared.module';
import { HomeModule } from './modules/home/home.module';
import { FavoritesModule } from './modules/favorites/favorites.module';

const appRoutes: Routes = [
    { path: 'home', component: HomeModule },
	{ path: 'favorites', component: FavoritesModule },
    { path: '', pathMatch: 'full', redirectTo: 'home' }
];

const setTitle = (titleService: Title) => {
    return () => {
        titleService.setTitle("Pulte Home Designer");
        return Promise.resolve();
    }
}

export function getBaseHref(platformLocation: PlatformLocation): string {
	return platformLocation.getBaseHrefFromDOM();
}

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        CommonModule,
		PhdCommonModule.forRoot(null),
		FormsModule,
		CoreModule,
        SharedModule,
		HomeModule,
		FavoritesModule,
		RouterModule.forRoot(appRoutes),
		CloudinaryModule.forRoot({ Cloudinary }, environment.cloudinary)
    ],
    providers: [
		{ provide: APP_INITIALIZER, useFactory: setTitle, deps: [Title], multi: true },
		{ provide: APP_BASE_HREF, useFactory: getBaseHref, deps: [PlatformLocation] }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
