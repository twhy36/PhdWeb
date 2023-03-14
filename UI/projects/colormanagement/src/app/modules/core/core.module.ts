import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { OrganizationService } from './services/organization.service';
import { StorageService } from './services/storage.service';
import { ColorService } from './services/color.service';
import { AccessGuard } from './services/access.guard';
import { MarketSelectorComponent } from './components/market-selector/market-selector.component';
import { OptionService } from './services/option.service';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PhdCommonModule, SidePanelComponent } from 'phd-common';
import { SettingsService } from './services/settings.service';
import { CheckboxModule } from 'primeng/checkbox';
import { PlanOptionService } from './services/plan-option.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ColorAdminService } from './services/color-admin.service';
import { PickListModule } from 'primeng/picklist';
import { NavigationComponent } from './components/navigation/navigation.component';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
	declarations: [
		MarketSelectorComponent,
		NavigationComponent
	],
	imports: [
		CommonModule,
		FormsModule,
		InfiniteScrollModule,
		MultiSelectModule,
		PhdCommonModule,
		CheckboxModule,
		ReactiveFormsModule,
		PhdCommonModule,
		ToastModule,
		PickListModule,
		RouterModule,
		NgbModule
	],
	exports: [
		MarketSelectorComponent,
		SidePanelComponent,
		NavigationComponent
	],
	providers: [
		OrganizationService,
		StorageService,
		AccessGuard,
		OptionService,
		ColorService,
		SettingsService,
		PlanOptionService,
		MessageService,
		ColorAdminService
	]
})

export class CoreModule {}
