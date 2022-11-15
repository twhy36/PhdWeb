import { NotificationService } from './services/notification.service';
import { NgModule, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

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
import { ReOrgService } from './services/re-org.service';
import { CatalogService } from './services/catalog.service';
import { TreeService } from './services/tree.service';

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
        CatalogService,
        ContractService,
        HomeSiteService,
        OrganizationService,
        PlanService,
        TreeService,
        ReleasesService,
        SalesService,
        SettingsService,
        StorageService,
        MessageService,
        PricingService,
        LoggingService,
        NotificationService,
        CommunityService,
        ReOrgService,
        { provide: ErrorHandler, useClass: PhdErrorHandler, deps: [LoggingService] }
    ]
})
export class CoreModule { }
