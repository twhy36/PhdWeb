import { NgModule, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';

import { LoggingService, PhdCommonModule, PhdErrorHandler } from 'phd-common';
import { SharedModule } from '../shared/shared.module';

import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { NavMenuComponent } from './components/nav-menu/nav-menu.component';
import { NavMenuItemComponent } from './components/nav-menu-item/nav-menu-item.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { SiteMenuComponent } from './components/site-menu/site-menu.component';
import { ErrorAlertComponent } from './components/error-alert/error-alert.component';

import { SalesInfoService } from './services/sales-info.service';
import { ScenarioService } from './services/scenario.service';
import { PlanService } from './services/plan.service';
import { OpportunityService } from './services/opportunity.service';
import { OptionService } from './services/option.service';
import { OrganizationService } from './services/organization.service';
import { AlertService } from './services/alert.service';
import { ConfirmNavigationGuard } from './guards/confirm-navigation.guard';
import { AttributeService } from './services/attribute.service';
import { LotService } from './services/lot.service';
import { SalesAgreementService } from './services/sales-agreement.service';
import { ContactService } from './services/contact.service';
import { NavigationService } from './services/navigation.service';
import { JobService } from './services/job.service';
import { ChangeOrderService } from './services/change-order.service';
import { ContractService } from './services/contract.service';
import { ReportsService } from './services/reports.service';
import { ModalOverrideSaveComponent } from './components/modal-override-save/modal-override-save.component';
import { NotificationService } from './services/notification.service';
import { FavoriteService } from './services/favorite.service';
import { LiteService } from './services/lite.service';

@NgModule({
	exports: [
		ConfirmModalComponent,
		NavMenuComponent,
		NavMenuItemComponent,
		NavigationComponent,
		NavBarComponent,
		SiteMenuComponent,
		ErrorAlertComponent,
		ModalOverrideSaveComponent
	],
	declarations: [
		ConfirmModalComponent,
		NavMenuComponent,
		NavMenuItemComponent,
		NavigationComponent,
		NavBarComponent,
		SiteMenuComponent,
		ErrorAlertComponent,
		ModalOverrideSaveComponent
	],
	imports: [
		CommonModule,
		FormsModule,
		HttpClientModule,
		RouterModule,
		NgbModule,
		ToastrModule,
		SharedModule,
		PhdCommonModule
	],
	providers: [
		SalesInfoService,
		ScenarioService,
		LotService,
		PlanService,
		OpportunityService,
		OptionService,
		OrganizationService,
		SalesAgreementService,
		ConfirmNavigationGuard,
		AlertService,
		AttributeService,
		ContactService,
		LoggingService,
		NavigationService,
		JobService,
		ChangeOrderService,
		ContractService,
		ReportsService,
		NotificationService,
		FavoriteService,
		LiteService,
		{ provide: ErrorHandler, useClass: PhdErrorHandler, deps: [LoggingService] }
	]
})
export class CoreModule { }
