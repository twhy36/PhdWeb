import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {MultiSelectModule} from 'primeng/multiselect';
import { OrganizationService } from './services/organization.service';
import { StorageService } from './services/storage.service';
import { ColorService } from './services/color.service';
import { AccessGuard } from './services/access.guard';
import { MarketSelectorComponent } from './components/market-selector/market-selector.component';
import { ColorsSearchHeaderComponent } from './components/search-header/colors-search-header.component';
import {ColorItemsSearchHeaderComponent} from './components/item-search-header/color-items-search-header.component'
import { OptionService } from './services/option.service';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PhdCommonModule, SidePanelComponent } from 'phd-common';
import { SettingsService } from './services/settings.service';
import { AddColorDialogComponent } from './components/add-color-dialog/add-color-dialog.component';
import { CheckboxModule } from 'primeng/checkbox';
import { PlanOptionService } from './services/plan-option.service';
import { EditColorSidePanelComponent } from './components/edit-color-side-panel/edit-color-side-panel.component';
import {ToastModule} from 'primeng/toast';
import {MessageService} from 'primeng/api';

@NgModule({
	declarations: [
		MarketSelectorComponent,
		ColorsSearchHeaderComponent,
		ColorItemsSearchHeaderComponent,
		AddColorDialogComponent,
  		EditColorSidePanelComponent,
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
	],
	exports: [
		MarketSelectorComponent,
		ColorsSearchHeaderComponent,
		ColorItemsSearchHeaderComponent,
		SidePanelComponent
	],
	providers: [
		OrganizationService,
		StorageService,
		AccessGuard,
		OptionService,
		ColorService,
		SettingsService,
		PlanOptionService,
		MessageService
	]
})
export class CoreModule {}
