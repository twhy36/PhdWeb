import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OrganizationService } from './services/organization.service';
import { StorageService } from './services/storage.service';
import { AccessGuard } from './services/access.guard';
import { Routes, RouterModule } from '@angular/router';

import { SearchHeaderComponent } from './components/search-header/search-header.component';

@NgModule({
	declarations: [SearchHeaderComponent],
	imports: [
		CommonModule
	],
	exports: [SearchHeaderComponent],
	providers: [
		OrganizationService,
		StorageService,
		AccessGuard
	]
})

export class CoreModule { }
