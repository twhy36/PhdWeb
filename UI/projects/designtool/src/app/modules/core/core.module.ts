import { NgModule, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';

import { PhdCommonModule } from 'phd-common';
import { SharedModule } from '../shared/shared.module';

import { NavMenuComponent } from './components/nav-menu/nav-menu.component';
import { NavMenuItemComponent } from './components/nav-menu-item/nav-menu-item.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { SiteMenuComponent } from './components/site-menu/site-menu.component';
import { ModalConfirmActionComponent } from './components/modal-confirm-action/modal-confirm-action.component';
import { ErrorAlertComponent } from './components/error-alert/error-alert.component';

import { SalesInfoService } from './services/sales-info.service';
import { ScenarioService } from './services/scenario.service';
import { PlanService } from './services/plan.service';
import { OpportunityService } from './services/opportunity.service';
import { OptionService } from './services/option.service';
import { OrganizationService } from './services/organization.service';
import { TreeService } from './services/tree.service';
import { AlertService } from './services/alert.service';
import { ConfirmNavigationGuard } from './guards/confirm-navigation.guard';
import { AttributeService } from './services/attribute.service';
import { LotService } from './services/lot.service';
import { SalesAgreementService } from './services/sales-agreement.service';
import { ContactService } from './services/contact.service';
import { LoggingService, PhdErrorHandler } from './services/logging.service';
import { NavigationService } from './services/navigation.service';
import { JobService } from './services/job.service';
import { ChangeOrderService } from './services/change-order.service';
import { ContractService } from './services/contract.service';
import { ReportsService } from './services/reports.service';
import { ModalOverrideSaveComponent } from './components/modal-override-save/modal-override-save.component';
import { ModalService } from './services/modal.service';
import { ModalComponent } from './components/modal/modal.component';
import { NotificationService } from './services/notification.service';

@NgModule({
	exports: [
		NavMenuComponent,
		NavMenuItemComponent,
		NavigationComponent,
		NavBarComponent,
		SiteMenuComponent,
		ModalConfirmActionComponent,
		ErrorAlertComponent,
		ModalOverrideSaveComponent,
		ModalComponent
	],
	declarations: [
		NavMenuComponent,
		NavMenuItemComponent,
		NavigationComponent,
		NavBarComponent,
		SiteMenuComponent,
		ModalConfirmActionComponent,
		ErrorAlertComponent,
		ModalOverrideSaveComponent,
		ModalComponent
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
		TreeService,
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
		ModalService,
		NotificationService,
		{ provide: ErrorHandler, useClass: PhdErrorHandler }
	],
	entryComponents: [ModalOverrideSaveComponent, ModalComponent]
})
export class CoreModule { }
