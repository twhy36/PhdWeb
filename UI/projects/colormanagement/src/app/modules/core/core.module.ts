import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OrganizationService } from './services/organization.service';
import { StorageService } from './services/storage.service';
import { AccessGuard } from './services/access.guard';

@NgModule({
	declarations: [],
	imports: [
		CommonModule
	],
	exports: [],
	providers: [
		OrganizationService,
		StorageService,
		AccessGuard
	]
})

export class CoreModule { }
