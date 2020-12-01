import { BrowserModule, Title } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { NgModule, APP_INITIALIZER } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MultiSelectModule } from 'primeng/multiselect';
import { NgbModule, NgbButtonsModule } from '@ng-bootstrap/ng-bootstrap';
import { AppInsights } from 'applicationinsights-js';

import { IdentityService } from 'phd-common/services';
import { PhdCommonModule } from 'phd-common';
import { CoreModule } from './modules/core/core.module';
import { SharedModule } from './modules/shared/shared.module';
import { SalesTallyModule } from './modules/salestally/salestally.module';

import { AppComponent } from './app.component';

import { environment } from '../environments/environment';

AppInsights.downloadAndSetup({ instrumentationKey: environment.appInsights.instrumentationKey });

const appInitializerFn = (identityService: IdentityService) => {
    // the APP_INITIALIZER provider waits for promises to be resolved
	return () => Promise.resolve();
    //return () => identityService.init().toPromise();
};

const setTitle = (titleService: Title) => {
    return () => {
        titleService.setTitle("Pulte Sales Portal");
        return Promise.resolve();
    }
}

@NgModule({
    bootstrap: [AppComponent],
    declarations: [
		AppComponent
    ],
	imports: [
		BrowserAnimationsModule,
		BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
		FormsModule,
		HttpClientModule,
		MultiSelectModule,
		CoreModule,
		SharedModule,
		SalesTallyModule,
		NgbModule,
		NgbButtonsModule,
		PhdCommonModule.forRoot(
			environment.msalConfig,
			environment.apiUrl,
			false
		),
		ReactiveFormsModule,
		RouterModule.forRoot([
			{ path: 'salestally', component: SalesTallyModule },
			{ path: 'unauthorized', component: SharedModule },
			{ path: '', pathMatch: 'full', component: SharedModule }
		])
    ],
    providers: [
        { provide: APP_INITIALIZER, useFactory: appInitializerFn, deps: [IdentityService], multi: true },
        { provide: APP_INITIALIZER, useFactory: setTitle, deps: [Title], multi: true}
    ]
})
export class AppModule { }
