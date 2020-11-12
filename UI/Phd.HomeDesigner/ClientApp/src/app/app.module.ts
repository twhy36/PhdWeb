import { BrowserModule, Title } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { Cloudinary } from 'cloudinary-core';

import { PhdCommonModule } from 'phd-common';

import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { HomeModule } from './modules/home/home.module';
import { CoreModule } from './modules/core/core.module';
import { SharedModule } from './modules/shared/shared.module';

const appRoutes: Routes = [
    { path: 'home', component: HomeModule },
    { path: '', pathMatch: 'full', redirectTo: 'home' }
];

const setTitle = (titleService: Title) => {
    return () => {
        titleService.setTitle("Pulte Home Designer");
        return Promise.resolve();
    }
}

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
		BrowserModule,
		PhdCommonModule.forRoot(null),
		FormsModule,
		CoreModule,
        SharedModule,
        HomeModule,
		RouterModule.forRoot(appRoutes),
		CloudinaryModule.forRoot({ Cloudinary }, environment.cloudinary)
    ],
    providers: [
        { provide: APP_INITIALIZER, useFactory: setTitle, deps: [Title], multi: true }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
