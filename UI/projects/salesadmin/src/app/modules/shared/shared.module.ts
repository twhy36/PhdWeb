import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PhdCommonModule } from 'phd-common';

import { PageHeaderComponent } from './components/page-header/page-header.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { LotTableComponent } from './components/lot-table/lot-table.component';

import { HandingsPipe } from './pipes/handings.pipe';
import { CapitalCaseSpacePipe } from './pipes/capitalCaseSpace.pipe';
import { InputFilterDirective } from './directives/input-filter.directive';

@NgModule({
	exports: [
		CapitalCaseSpacePipe,
		HandingsPipe,
		PageHeaderComponent,
		SearchBarComponent,
		LotTableComponent,
		InputFilterDirective
	],
	declarations: [
		CapitalCaseSpacePipe,
		HandingsPipe,
		PageHeaderComponent,
		SearchBarComponent,
		LotTableComponent,
		InputFilterDirective
	],
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		HttpClientModule,
		RouterModule,
		BrowserAnimationsModule,
		PhdCommonModule
	],
	providers: [
	]
})
export class SharedModule { }
