import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from './services/organization.service';
import { StorageService } from './services/storage.service';
import { ColorService } from './services/color.service';
import { AccessGuard } from './services/access.guard';
import { MarketSelectorComponent } from './components/market-selector/market-selector.component';
import { ColorsSearchHeaderComponent } from './components/search-header/colors-search-header.component';
import { OptionService } from './services/option.service';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PhdCommonModule } from 'phd-common';

@NgModule({
	declarations: [
		MarketSelectorComponent,
		ColorsSearchHeaderComponent
	],
	imports: [
		CommonModule,
		FormsModule,
		InfiniteScrollModule,
		PhdCommonModule
	],
	exports: [
		MarketSelectorComponent,
		ColorsSearchHeaderComponent
	],
	providers: [
		OrganizationService,
		StorageService,
		AccessGuard,
		OptionService,
		ColorService
	]
})

export class CoreModule { }
