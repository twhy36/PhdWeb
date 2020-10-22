import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OrganizationService } from './services/organization.service';
import { SearchService } from './services/search.service';
import { StorageService } from './services/storage.service';
import { SalesTallyService } from './services/salestally.service';
import { AccessGuard } from './services/access.guard';

@NgModule({
	declarations: [],
	imports: [
		CommonModule
	],
	exports: [],
	providers: [
		OrganizationService,
		SearchService,
		StorageService,
		SalesTallyService,
		AccessGuard
	]
})

export class CoreModule { }
