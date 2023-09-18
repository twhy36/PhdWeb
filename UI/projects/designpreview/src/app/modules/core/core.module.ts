import { ErrorHandler, NgModule } from '@angular/core';
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
import { AttributeService } from './services/attribute.service';
import { AuthService } from './services/auth.service';
import { ReportsService } from './services/reports.service';
import { BrandService } from './services/brand.service';
import { AdobeService } from './services/adobe.service';
import { DialogService } from './services/dialog.service';
import { LoggedInGuard } from './guards/logged-in.guard';
import { InternalGuard } from './guards/internal.guard';
import { ExternalGuard } from './guards/external.guard';
import { PresaleGuard } from './guards/presale.guard';
import { ClickDirective } from './directives/click-directive.directive';
import { InfoDisclaimerComponent } from './components/info-disclaimer/info-disclaimer.component';
import { LoggingService, PhdErrorHandler } from 'phd-common';
import { HamburgerMenuComponent } from './components/nav-bar/hamburger-menu/hamburger-menu.component';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
@NgModule({
	exports: [
	NavBarComponent,
	IdleLogoutComponent,
	ClickDirective,
	BannerComponent,
	HamburgerMenuComponent
	],
	declarations: [
	NavBarComponent,
	IdleLogoutComponent,
	ClickDirective,
	DefaultErrorComponent,
	BannerComponent,
	WelcomeModalComponent,
	InfoDisclaimerComponent,
 	HamburgerMenuComponent
	],
	imports: [
	CommonModule,
	HttpClientModule,
	RouterModule,
	SharedModule,
	MatButtonModule,
	MatIconModule,
	MatExpansionModule
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
	AttributeService,
	AuthService,
	ReportsService,
	BrandService,
	AdobeService,
	LoggingService,
	DialogService,
	LoggedInGuard,
	InternalGuard,
	ExternalGuard,
	PresaleGuard,
	{ provide: ErrorHandler, useClass: PhdErrorHandler, deps: [LoggingService] }
	]
	})
export class CoreModule { }
