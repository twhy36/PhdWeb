import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';

import { PhdCommonModule } from 'phd-common';
import { SharedModule } from '../shared/shared.module';
import { ReOrgComponent } from './re-org/re-org.component';

const moduleRoutes: Routes = [
	{
		path: 'reOrg',
		component: ReOrgComponent,
		canActivate: [],
		data: { hideMarket: true },
		children: []
	}
];

@NgModule({
	declarations: [
		ReOrgComponent
	],
	exports: [
	],
	imports: [
        RouterModule.forChild(moduleRoutes),
		SharedModule,
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		ToastModule,
		PhdCommonModule,
		CheckboxModule
	]
})
export class ReOrgModule { }
