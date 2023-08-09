import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { APP_BASE_HREF, PlatformLocation } from '@angular/common';

import { environment } from '../environments/environment';

import { NgbModule, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';

import { CloudinaryModule } from '@cloudinary/ng';
import { Cloudinary } from '@cloudinary/url-gen';

import { switchMap } from 'rxjs/operators';
import { never, of } from 'rxjs';

import { PhdCommonModule, IdentityService, AUTH_CONFIG, APP_INSIGHTS_CONFIG, TELEMETRY_INIT, setClientApp, CLOUDINARY } from 'phd-common';

import { CoreModule } from './modules/core/core.module';
import { ChangeOrdersModule } from './modules/change-orders/change-orders.module';
import { StoreModule } from './modules/ngrx-store/store.module';
import { EditHomeModule } from './modules/edit-home/edit-home.module';
import { NewHomeModule } from './modules/new-home/new-home.module';
import { ScenarioSummaryModule } from './modules/scenario-summary/scenario-summary.module';
import { PointOfSaleModule } from './modules/point-of-sale/point-of-sale.module';
import { LiteModule } from './modules/lite/lite.module';

import { NgbDateCustomParserFormatter } from './modules/shared/classes/ngbDatePicker/ngbDateCustomParserFormatter';

import { AppComponent } from './app.component';

const appRoutes: Routes = [
	{ path: 'new-home', component: NewHomeModule },
	{ path: 'edit-home', component: EditHomeModule },
	{ path: 'scenario-summary', component: ScenarioSummaryModule },
	{ path: 'point-of-sale', component: PointOfSaleModule },
	{ path: 'change-orders', component: ChangeOrdersModule },
	{ path: 'lite', component: LiteModule },
	{ path: '', pathMatch: 'full', redirectTo: 'new-home' }
];

const appInitializerFn = (identityService: IdentityService) =>
{
	// the APP_INITIALIZER provider waits for promises to be resolved
	return () => identityService.init().pipe(
		switchMap(loggedIn =>
		{
			if (!loggedIn)
			{
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
		LiteModule,
		NewHomeModule,
		ScenarioSummaryModule,
		PointOfSaleModule,
		RouterModule.forRoot(appRoutes),
		StoreModule,
		CloudinaryModule,
		NgbModule,
		ToastrModule.forRoot({ closeButton: true })
	],
	providers: [
		{ provide: APP_INITIALIZER, useFactory: appInitializerFn, deps: [IdentityService], multi: true },
		{ provide: APP_BASE_HREF, useFactory: getBaseHref, deps: [PlatformLocation] },
		{ provide: NgbDateParserFormatter, useClass: NgbDateCustomParserFormatter },
		{ provide: AUTH_CONFIG, useValue: environment.authConfig },
		{ provide: APP_INSIGHTS_CONFIG, useValue: environment.appInsights },
		{ provide: TELEMETRY_INIT, useValue: setClientApp('Design Tool') },
		{ provide: CLOUDINARY, useValue: new Cloudinary(environment.cloudinary) }
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
