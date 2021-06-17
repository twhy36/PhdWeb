import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { NavBarComponent } from './components/nav-bar/nav-bar.component';

import { ChangeOrderService } from './services/change-order.service';
import { FavoriteService } from './services/favorite.service';
import { JobService } from './services/job.service';
import { LotService } from './services/lot.service';
import { OptionService } from './services/option.service';
import { OrganizationService } from './services/organization.service';
import { PlanService } from './services/plan.service';
import { SalesAgreementService } from './services/sales-agreement.service';
import { TreeService } from './services/tree.service';
import { AttributeService } from './services/attribute.service';
import { AuthService } from './services/auth.service';
import { LoggedInGuard } from './guards/logged-in.guard';
import { InternalGuard } from './guards/internal.guard';
import { ExternalGuard } from './guards/external.guard';

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
		RouterModule,
		SharedModule,
		FontAwesomeModule
	],
	providers: [
		ChangeOrderService,
		FavoriteService,
		JobService,
		LotService,
		OptionService,
		OrganizationService,
		PlanService,
		SalesAgreementService,
		TreeService,
		AttributeService,
		AuthService,
		LoggedInGuard,
		InternalGuard,
		ExternalGuard
	]
})
export class CoreModule { }
