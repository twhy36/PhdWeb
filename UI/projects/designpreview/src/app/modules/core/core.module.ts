import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';

import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { IdleLogoutComponent } from './components/idle-logout/idle-logout.component';
import { DefaultErrorComponent } from './components/default-error/default-error.component';
import { BannerComponent } from './components/banner/banner.component';
import { WelcomeModalComponent } from './components/welcome-modal/welcome-modal.component';

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
import { ReportsService } from './services/reports.service';
import { BrandService } from './services/brand.service';
import { AdobeService } from './services/adobe.service';
import { LoggedInGuard } from './guards/logged-in.guard';
import { InternalGuard } from './guards/internal.guard';
import { ExternalGuard } from './guards/external.guard';
import { PresaleGuard } from './guards/presale.guard';
import { ClickDirective } from './directives/click-directive.directive';
import { TokenService } from './services/token.service';
import { InfoDisclaimerComponent } from './components/info-disclaimer/info-disclaimer.component';

@NgModule({
	exports: [
		NavBarComponent,
		IdleLogoutComponent,
		ClickDirective,
		BannerComponent
	],
	declarations: [
		NavBarComponent,
		IdleLogoutComponent,
		ClickDirective,
		DefaultErrorComponent,
		BannerComponent,
		WelcomeModalComponent,
		InfoDisclaimerComponent
	],
	imports: [
		CommonModule,
		HttpClientModule,
		RouterModule,
		SharedModule
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
		TokenService,
		ReportsService,
		BrandService,
		AdobeService,
		LoggedInGuard,
		InternalGuard,
		ExternalGuard,
		PresaleGuard
	]
})
export class CoreModule { }
