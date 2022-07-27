import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OptionPackageRoutingModule } from './option-package-routing.module';
import { OptionPackagesPageComponent } from './components/option-packages-page/option-packages-page.component';
import { OptionPackagesHeaderComponent } from './components/option-packages-header/option-packages-header.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EditOptionPackagesComponent } from './components/edit-option-packages/edit-option-packages.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PhdCommonModule } from 'phd-common';
import { SharedModule } from 'primeng/api';
import { CoreModule } from '../core/core.module';
import { NameDialogComponent } from './components/name-dialog/name-dialog.component';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';


@NgModule({
	declarations: [
		OptionPackagesPageComponent,
		OptionPackagesHeaderComponent,
		NameDialogComponent,
		EditOptionPackagesComponent
	],
	imports: [
		CommonModule,
		OptionPackageRoutingModule,
		NgbModule,
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		CoreModule,
		SharedModule,
		InfiniteScrollModule,
		PhdCommonModule,
		MultiSelectModule,
		TableModule,
		DropdownModule
	],
	exports: [
		OptionPackagesPageComponent,
		OptionPackagesHeaderComponent,
		EditOptionPackagesComponent
	 ]
})
export class OptionPackageModule { }
