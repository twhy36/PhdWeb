import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterModule, Routes } from '@angular/router';

// External Modules
import { PhdCommonModule } from 'phd-common';
import { BuildMode } from '../shared/models/build-mode.model';
import { ExternalGuard } from '../core/guards/external.guard';
import { InternalGuard } from '../core/guards/internal.guard';
import { PresaleGuard } from '../core/guards/presale.guard';
import { LoggedInGuard } from '../core/guards/logged-in.guard';

// Mobile Module
import { ActionBarComponent } from './action-bar/action-bar.component';
import { CarouselModule } from 'primeng/carousel';
import { ChoiceCardDetailComponent } from './choice-card-detail/choice-card-detail.component';
import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { EstimatedTotalsComponent } from './estimated-totals/estimated-totals.component';
import { GlobalFooterComponent } from './global-footer/global-footer.component';
import { GlobalHeaderComponent } from './global-header/global-header.component';
import { HamburgerMenuComponent } from './hamburger-menu/hamburger-menu.component';
import { LandingComponent } from './landing/landing.component';
import { MobileComponent } from './mobile.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { SummaryComponent } from './summary/summary.component';
import { SummaryRowComponent } from './shared/summary-row/summary-row.component';

const moduleRoutes: Routes = [
	{
		path: 'mobile',
		component: MobileComponent,
		children: [
			{
				path: 'home',
				canActivate: [ExternalGuard],
				component: LandingComponent,
				data: { pageLoadEvent: 'Home', buildMode: BuildMode.Buyer },
			},
			{
				path: 'home/:salesAgreementId',
				canActivate: [InternalGuard],
				component: LandingComponent,
				data: { pageLoadEvent: 'Home', buildMode: BuildMode.Buyer },
			},
			{
				path: 'preview',
				component: LandingComponent,
				canActivate: [InternalGuard],
				data: { buildMode: BuildMode.Preview },
			},
			{
				path: 'preview/:treeVersionId',
				component: LandingComponent,
				canActivate: [InternalGuard],
				data: { buildMode: BuildMode.Preview },
			},
			{
				path: 'presale',
				canActivate: [PresaleGuard],
				component: LandingComponent,
				data: { pageLoadEvent: 'Home', buildMode: BuildMode.Presale },
			},
			{
				path: 'favorites/summary',
				component: SummaryComponent,
				canActivate: [LoggedInGuard],
				data: { pageLoadEvent: 'FavoritesSummary' }
			},
			{
				path: 'options/:subGroupCatalogId/:decisionPointCatalogId/:choiceCatalogId',
				component: ChoiceCardDetailComponent,
			},
			{ path: 'error', component: LandingComponent },
			{ path: '**', pathMatch: 'full', redirectTo: '' },
			{ path: '', component: LandingComponent },
		],
	},
];

@NgModule({
	exports: [LandingComponent],
	declarations: [
	MobileComponent,
	GlobalHeaderComponent,
	HamburgerMenuComponent,
	LandingComponent,
	MobileComponent,
	HamburgerMenuComponent,
	GlobalHeaderComponent,
	GlobalFooterComponent,
	ChoiceCardDetailComponent,
	ActionBarComponent,
	EstimatedTotalsComponent,
	ConfirmDialogComponent,
	SummaryComponent,
	SummaryRowComponent,
	],
	imports: [
	CommonModule,
	MatButtonModule,
	MatDialogModule,
	MatExpansionModule,
	MatIconModule,
	MatMenuModule,
	MatSidenavModule,
	NgbModule,
	CloudinaryModule,
	CarouselModule,
	MatListModule,
	PhdCommonModule,
	RouterModule.forChild(moduleRoutes),
	],
	})
export class MobileModule { }
