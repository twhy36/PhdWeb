import { NgModule, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { ConfirmationService } from 'primeng/api';
import { MessageService } from 'primeng/api';

import { ButtonBarComponent } from './components/button-bar/button-bar.component';
import { NavigationBarComponent } from './components/navigation-bar/navigation-bar.component';

import { CommunityService } from './services/community.service';
import { ContractService } from './services/contract.service';
import { HomeSiteService } from './services/homesite.service';
import { OrganizationService } from './services/organization.service';
import { PlanService } from './services/plan.service';
import { ReleasesService } from './services/releases.service';
import { PricingService } from './services/pricing.service';
import { SalesService } from './services/sales.service';
import { SettingsService } from './services/settings.service';
import { StorageService } from './services/storage.service';
import { LoggingService, PhdErrorHandler } from './services/logging.service';
import { PhdCommonModule } from 'phd-common';

@NgModule({
    exports: [
        NavigationBarComponent,
        ButtonBarComponent,
    ],
    declarations: [
        NavigationBarComponent,
        ButtonBarComponent,

    ],
    imports: [
        CommonModule,
        FormsModule,
        HttpClientModule,
		RouterModule,
		PhdCommonModule
    ],
	providers: [
		ContractService,
        HomeSiteService,
        OrganizationService,
        PlanService,
		ReleasesService,
		SalesService,
        SettingsService,
        StorageService,
        MessageService,
        ConfirmationService,
        PricingService,
        LoggingService,
        CommunityService,
		{ provide: ErrorHandler, useClass: PhdErrorHandler }
    ]
})
export class CoreModule { }
