import { NgModule, ErrorHandler } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { NgbModule, NgbCollapseModule, NgbDropdownModule, NgbTabsetModule } from '@ng-bootstrap/ng-bootstrap';

import { NavigationBarComponent } from './components/navigation-bar/navigation-bar.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';

import { AttributeService } from './services/attribute.service';
import { CatalogService } from './services/catalog.service';
import { CopyTreeService } from './services/copy-tree.service';
import { DivisionalOptionService } from './services/divisional-option.service';
import { DivisionalService } from './services/divisional.service';
import { LocationService } from './services/location.service';
import { LoggingService, PhdErrorHandler } from './services/logging.service';
import { MessageService } from 'primeng/api';
import { NationalService } from './services/national.service';
import { OrganizationService } from './services/organization.service';
import { PlanService } from './services/plan.service';
import { PlanOptionService } from './services/plan-option.service';
import { SettingsService } from './services/settings.service';
import { StorageService } from './services/storage.service';
import { TreeService } from './services/tree.service';
import { UiUtilsService } from './services/ui-utils.service';
import { ImageService } from './services/image.service';
import { LoadingService } from './services/loading.service';
import { ModalService } from './services/modal.service';

import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { PhdCommonModule } from 'phd-common';


@NgModule({
	exports: [
		NavigationBarComponent,
		ConfirmModalComponent
	],
	declarations: [
		NavigationBarComponent,
		ConfirmModalComponent
	],
	imports: [
		CommonModule,
		FormsModule,
		HttpClientModule,
		RouterModule,
		NgbModule,
		NgbCollapseModule,
		NgbDropdownModule,
		NgbTabsetModule,
		PhdCommonModule
	],
	providers: [
		LoggingService,
		NationalService,
		DivisionalOptionService,
		DivisionalService,
		PlanService,
		PlanOptionService,
		SettingsService,
		StorageService,
		UiUtilsService,
		MessageService,
		OrganizationService,
		CatalogService,
		TreeService,
		PlanService,
		CopyTreeService,
		AttributeService,
		LocationService,
		ImageService,
		LoadingService,
		CanDeactivateGuard,
		ModalService,
		{ provide: ErrorHandler, useClass: PhdErrorHandler }
	],
	entryComponents: [ConfirmModalComponent]
})
export class CoreModule { }
