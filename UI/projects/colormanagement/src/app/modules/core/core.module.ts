import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from './services/organization.service';
import { StorageService } from './services/storage.service';
import { AccessGuard } from './services/access.guard';
import { MarketSelectorComponent } from './components/market-selector/market-selector.component';

@NgModule({
	declarations: [
		MarketSelectorComponent
	],
	imports: [
		CommonModule,
		FormsModule
	],
	exports: [
		MarketSelectorComponent
	],
	providers: [
		OrganizationService,
		StorageService,
		AccessGuard
	]
})

export class CoreModule { }
