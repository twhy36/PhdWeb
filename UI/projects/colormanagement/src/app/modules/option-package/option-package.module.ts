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
import { AddDialogComponent } from './components/add-dialog/add-dialog.component';
import { MultiSelectModule } from 'primeng/multiselect';


@NgModule({
	declarations: [
		OptionPackagesPageComponent,
		OptionPackagesHeaderComponent,
		AddDialogComponent,
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
		MultiSelectModule
	],
	exports: [
		OptionPackagesPageComponent,
		OptionPackagesHeaderComponent,
		EditOptionPackagesComponent
	 ]
})
export class OptionPackageModule { }
