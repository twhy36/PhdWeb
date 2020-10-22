import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ContractsModule } from './modules/contracts/contracts.module';
import { CoreModule } from './modules/core/core.module';
import { LotManagementModule } from './modules/lot-managment/lot-management.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { CommunityManagementModule } from './modules/community-management/community-management.module'
import { PhdCommonModule } from 'phd-common';
import { AppComponent } from './app.component';

import { IdentityService } from 'phd-common/services';

import { ConfirmModalComponent } from 'phd-common/components/confirm-modal/confirm-modal.component';
import { environment } from 'environments/environment';

const appRoutes: Routes = [
	{ path: 'contracts', component: ContractsModule },
    { path: 'lot-management', component: LotManagementModule },
    { path: 'pricing', component: PricingModule },
    { path: 'community-management', component: CommunityManagementModule },
    { path: '', pathMatch: 'full', redirectTo: 'lot-management' }
];

const appInitializerFn = (identityService: IdentityService) =>
{
    // the APP_INITIALIZER provider waits for promises to be resolved
    return () => identityService.init().toPromise();
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
		PhdCommonModule.forRoot({
			authQueryParams: environment.authQueryParams,
			clientId: environment.clientId,
			tenant: environment.tenant
		}, environment.apiUrl),
		CoreModule,
		ContractsModule,
        LotManagementModule,
        PricingModule,
        CommunityManagementModule,
        RouterModule.forRoot(appRoutes)
    ],
    providers: [
        { provide: APP_INITIALIZER, useFactory: appInitializerFn, deps: [IdentityService], multi: true }
    ],
	bootstrap: [AppComponent],
	entryComponents: [ConfirmModalComponent]
})
export class AppModule { }
