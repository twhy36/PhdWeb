import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../shared/shared.module';

import { NavBarComponent } from './components/nav-bar/nav-bar.component';

import { ChangeOrderService } from './services/change-order.service';
import { JobService } from './services/job.service';
import { LotService } from './services/lot.service';
import { OptionService } from './services/option.service';
import { OrganizationService } from './services/organization.service';
import { PlanService } from './services/plan.service';
import { SalesAgreementService } from './services/sales-agreement.service';
import { TreeService } from './services/tree.service';

@NgModule({
	exports: [
		NavBarComponent
	],
	declarations: [
		NavBarComponent
	],
	imports: [
		CommonModule,
		HttpClientModule,
		SharedModule
	],
	providers: [
		ChangeOrderService,
		JobService,
		LotService,
		OptionService,
		OrganizationService,
		PlanService,
		SalesAgreementService,
		TreeService
	]
})
export class CoreModule { }
