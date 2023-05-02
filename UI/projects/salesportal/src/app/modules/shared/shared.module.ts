import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MultiSelectModule } from 'primeng/multiselect';

import { PhdCommonModule } from 'phd-common';

import { CapitalCaseSpacePipe } from './pipes/capitalCaseSpace.pipe';
import { TruncateStringPipe } from './pipes/truncateString.pipe';
import { HomeComponent } from './components/home/home.component';
import { PHDSearchComponent } from './components/phd-search/phd-search.component';
import { PortalItemComponent } from './components/portal-item/portal-item.component';
import { SalesCommunitySelectorComponent } from "./components/sales-community-selector/sales-community-selector.component";
import { SpecHomeComponent } from './components/spec-homes/spec-homes.component';
import { PlanPreviewComponent } from './components/plan-preview/plan-preview.component';
import { UnauthorizedComponent } from "./components/unauthorized/unauthorized.component";

const routes: Routes = [
	{ path: '', component: HomeComponent },
	{ path: 'unauthorized', component: UnauthorizedComponent }
];

@NgModule({
	declarations: [
		HomeComponent,
		PortalItemComponent,
		SalesCommunitySelectorComponent,
		SpecHomeComponent,
		UnauthorizedComponent,
		PlanPreviewComponent,
		PHDSearchComponent,
		CapitalCaseSpacePipe,
		TruncateStringPipe
	],
	imports: [
		BrowserAnimationsModule,
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		MultiSelectModule,
		NgbModule,
		RouterModule.forChild(routes),
		PhdCommonModule
	],
	exports: [
		PortalItemComponent,
		SalesCommunitySelectorComponent,
		SpecHomeComponent,
		UnauthorizedComponent,
		PlanPreviewComponent,
		PHDSearchComponent,
		CapitalCaseSpacePipe
	],
	providers: [
	]
})

export class SharedModule { }
