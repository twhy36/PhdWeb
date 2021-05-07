import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { APP_BASE_HREF, PlatformLocation } from "@angular/common";

import { environment } from '../environments/environment';

import { NgbModule, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';

import { Cloudinary as CloudinaryCore } from 'cloudinary-core';
import { CloudinaryConfiguration, CloudinaryModule } from '@cloudinary/angular-5.x';
import { switchMap } from 'rxjs/operators';
import { never, of } from 'rxjs';

export const cloudinary = { Cloudinary: CloudinaryCore };
export const config: CloudinaryConfiguration = environment.cloudinary;

import { PhdCommonModule, IdentityService, AUTH_CONFIG } from 'phd-common';

import { CoreModule } from './modules/core/core.module';
import { ChangeOrdersModule } from './modules/change-orders/change-orders.module';
import { StoreModule } from './modules/ngrx-store/store.module';
import { EditHomeModule } from './modules/edit-home/edit-home.module';
import { NewHomeModule } from './modules/new-home/new-home.module';
import { ScenarioSummaryModule } from './modules/scenario-summary/scenario-summary.module';
import { PointOfSaleModule } from './modules/point-of-sale/point-of-sale.module';
import { NgbDateCustomParserFormatter } from './modules/shared/classes/ngbDatePicker/ngbDateCustomParserFormatter';

import { AppComponent } from './app.component';

const appRoutes: Routes = [
    { path: 'new-home', component: NewHomeModule },
    { path: 'edit-home', component: EditHomeModule },
    { path: 'scenario-summary', component: ScenarioSummaryModule },
	{ path: 'point-of-sale', component: PointOfSaleModule },
	{ path: 'change-orders', component: ChangeOrdersModule },
    { path: '', pathMatch: 'full', redirectTo: 'new-home' }
];

const appInitializerFn = (identityService: IdentityService) => {
	// the APP_INITIALIZER provider waits for promises to be resolved
	return () => identityService.init().pipe(
		switchMap(loggedIn => {
			if (!loggedIn) {
                identityService.login();
                return never();
            }
            return of(loggedIn);
		})
	).toPromise();
};

export function getBaseHref(platformLocation: PlatformLocation): string
{
	return platformLocation.getBaseHrefFromDOM();
}

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        FormsModule,
        BrowserModule,
        PhdCommonModule.forRoot(environment.apiUrl),
        CommonModule,
		CoreModule,
		ChangeOrdersModule,
        EditHomeModule,
        NewHomeModule,
        ScenarioSummaryModule,
        PointOfSaleModule,
        RouterModule.forRoot(appRoutes),
		StoreModule,
		CloudinaryModule.forRoot(cloudinary, config),
		NgbModule,
		ToastrModule.forRoot({ closeButton: true })
    ],
    providers: [
        { provide: APP_INITIALIZER, useFactory: appInitializerFn, deps: [IdentityService], multi: true },
        { provide: APP_BASE_HREF, useFactory: getBaseHref, deps: [PlatformLocation] },
        { provide: NgbDateParserFormatter, useClass: NgbDateCustomParserFormatter },
		{ provide: AUTH_CONFIG, useValue: environment.authConfig }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
