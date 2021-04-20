import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TreeTableModule } from 'primeng/treetable';

import { ReportComponent } from './components/report/report.component';

const routes: Routes = [
	{ path: 'salestally', component: ReportComponent }
];

@NgModule({
	declarations: [
		ReportComponent
	],
	imports: [
		CommonModule,
		BrowserModule,
		TreeTableModule,
		RouterModule.forChild(routes)
	],
	providers: []
})

export class SalesTallyModule { }
