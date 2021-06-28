import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NgbModule, NgbButtonsModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MultiSelectModule } from 'primeng/multiselect';

import { PhdCommonModule } from 'phd-common';

import { CapitalCaseSpacePipe } from './pipes/capitalCaseSpace.pipe';
import { HomeComponent } from './components/home/home.component';
import { UnauthorizedComponent } from "./components/unauthorized/unauthorized.component";

const routes: Routes = [
	{ path: '', component: HomeComponent },
	{ path: 'unauthorized', component: UnauthorizedComponent }
];

@NgModule({
	declarations: [
		HomeComponent,
		UnauthorizedComponent,
		CapitalCaseSpacePipe
	],
	imports: [
		BrowserAnimationsModule,
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		MultiSelectModule,
		NgbButtonsModule,
		NgbModule,
		RouterModule.forChild(routes),
		PhdCommonModule
	],
	exports: [
		UnauthorizedComponent,
		CapitalCaseSpacePipe
	],
	providers: [
	]
})

export class SharedModule { }
