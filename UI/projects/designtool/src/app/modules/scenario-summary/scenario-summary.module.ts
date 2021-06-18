import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { CloudinaryModule } from '@cloudinary/angular-5.x';

import { PhdCommonModule } from 'phd-common';

import { ScenarioSummaryComponent } from './components/scenario-summary/scenario-summary.component';
import { SummaryHeaderComponent } from './components/summary-header/summary-header.component';
import { PricingBreakdownComponent } from './components/pricing-breakdown/pricing-breakdown.component';
import { SummaryActionBarComponent } from './components/summary-action-bar/summary-action-bar.component';

import { SharedModule } from '../shared/shared.module';

import { ConfirmNavigationGuard } from '../core/guards/confirm-navigation.guard';

import { IsFilteredPipe } from './pipes/is-filtered.pipe';

const moduleRoutes: Routes = [
	{
		path: 'scenario-summary',
		component: ScenarioSummaryComponent,
		canDeactivate: [ConfirmNavigationGuard]
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
		SummaryHeaderComponent,
		PricingBreakdownComponent,
		IsFilteredPipe,
		SummaryActionBarComponent
	]
})
export class ScenarioSummaryModule { }
