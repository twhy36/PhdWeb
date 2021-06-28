import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { tap } from 'rxjs/operators';

import { ContractsModule } from './modules/contracts/contracts.module';
import { CoreModule } from './modules/core/core.module';
import { LotManagementModule } from './modules/lot-managment/lot-management.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { CommunityManagementModule } from './modules/community-management/community-management.module'
import { PhdCommonModule, ConfirmModalComponent, IdentityService, AUTH_CONFIG } from 'phd-common';
import { ReOrgModule } from './modules/re-org/re-org.module';
import { AppComponent } from './app.component';

import { environment } from '../environments/environment';

const appRoutes: Routes = [
	{ path: 'contracts', component: ContractsModule },
    { path: 'lot-management', component: LotManagementModule },
    { path: 'pricing', component: PricingModule },
    { path: 'community-management', component: CommunityManagementModule },
    { path: 'reOrg', component: ReOrgModule },
    { path: '', pathMatch: 'full', redirectTo: 'lot-management' }
];

const appInitializerFn = (identityService: IdentityService) => {
	// the APP_INITIALIZER provider waits for promises to be resolved
	return () => identityService.init().pipe(
		tap(loggedIn => {
			if (!loggedIn) {
				identityService.login();
			}
		})
	).toPromise();
};

@NgModule({
    declarations: [
		AppComponent
    ],
    imports: [
        FormsModule,
        BrowserModule,
        CommonModule,
		NgbModule,
		PhdCommonModule.forRoot(environment.apiUrl),
		CoreModule,
		ContractsModule,
        LotManagementModule,
        PricingModule,
		CommunityManagementModule,
		ReOrgModule,
        RouterModule.forRoot(appRoutes)
    ],
    providers: [
        { provide: APP_INITIALIZER, useFactory: appInitializerFn, deps: [IdentityService], multi: true },
		{ provide: AUTH_CONFIG, useValue: environment.authConfig }
    ],
	bootstrap: [AppComponent]
})
export class AppModule { }
