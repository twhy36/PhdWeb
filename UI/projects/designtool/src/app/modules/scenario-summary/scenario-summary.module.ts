import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { CloudinaryModule } from '@cloudinary/ng';

import { PhdCommonModule } from 'phd-common';

import { ScenarioSummaryComponent } from './components/scenario-summary/scenario-summary.component';
import { SummaryActionBarComponent } from './components/summary-action-bar/summary-action-bar.component';

import { SharedModule } from '../shared/shared.module';

import { ConfirmNavigationGuard } from '../core/guards/confirm-navigation.guard';

import { IsFilteredPipe } from './pipes/is-filtered.pipe';
import { LiteSummaryGuard } from '../lite/guards/lite-summary.guard';

const moduleRoutes: Routes = [
	{
		path: 'scenario-summary',
		component: ScenarioSummaryComponent,
		canDeactivate: [ConfirmNavigationGuard],
		canActivate: [LiteSummaryGuard]
	},
	{
		path: 'scenario-summary/:jobId',
		component: ScenarioSummaryComponent,
		canDeactivate: [ConfirmNavigationGuard]
	}
];

@NgModule({
	imports: [
		CommonModule,
		SharedModule,
		FormsModule,
		CloudinaryModule,
		PhdCommonModule,
		RouterModule.forChild(moduleRoutes),
		NgbModule
	],
	declarations: [
		ScenarioSummaryComponent,
		IsFilteredPipe,
		SummaryActionBarComponent
	]
})
export class ScenarioSummaryModule { }
