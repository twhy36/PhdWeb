import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OptionPackageRoutingModule } from './option-package-routing.module';
import { OptionPackagesPageComponent } from './components/option-packages-page/option-packages-page.component';
import { OptionPackagesHeaderComponent } from './components/option-packages-header/option-packages-header.component';
import { EditOptionPackagesComponent } from './components/edit-option-packages/edit-option-packages.component';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PhdCommonModule } from 'phd-common';
import { SharedModule } from 'primeng/api';
import { CoreModule } from '../core/core.module';
import { MultiSelectModule } from 'primeng/multiselect';


@NgModule({
	declarations: [
		OptionPackagesPageComponent,
		OptionPackagesHeaderComponent,
		EditOptionPackagesComponent
	],
	imports: [
		CommonModule,
		OptionPackageRoutingModule,
		NgbModule,
		CommonModule,
		FormsModule,
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
