// There is currently a bug in eslint with angular decorators and expected indentation
// For more information see this github issue: https://github.com/typescript-eslint/typescript-eslint/issues/1824
/* eslint-disable indent */
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { CarouselModule } from 'primeng/carousel';

// External Modules
import { PhdCommonModule } from 'phd-common';
import { BuildMode } from '../shared/models/build-mode.model';
import { LoggedInGuard } from '../core/guards/logged-in.guard';
import { SharedModule } from '../shared/shared.module';

// Mobile Module
import { ActionBarComponent } from './shared/action-bar/action-bar.component';
import { ChoiceCardDetailComponent } from './choice-card-detail/choice-card-detail.component';
import { CloudinaryModule } from '@cloudinary/ng';
import { EstimatedTotalsComponent } from './shared/estimated-totals/estimated-totals.component';
import { FloorplanImageDialogComponent } from './shared/floorplan-image-dialog/floorplan-image-dialog.component';
import { FloorplanImageTabsComponent } from './shared/floorplan-image-tabs/floorplan-image-tabs.component';
import { GlobalFooterComponent } from './global-footer/global-footer.component';
import { GlobalHeaderComponent } from './global-header/global-header.component';
import { HamburgerMenuComponent } from './hamburger-menu/hamburger-menu.component';
import { LandingComponent } from './landing/landing.component';
import { MobileComponent } from './mobile.component';
import { OptionsComponent } from './options/options.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { SummaryAttributeLocationRowComponent } from './shared/summary-attribute-location-row/summary-attribute-location-row.component';
import { GroupListComponent } from './shared/group-list/group-list.component';
import { ChoiceCardComponent } from './shared/choice-card/choice-card.component';
import { SummaryComponent } from './summary/summary.component';
import { SummaryRowComponent } from './shared/summary-row/summary-row.component';
import { ViewOptionsLinkComponent } from './shared/view-options-link/view-options-link.component';
import { PlanSummaryComponent } from './shared/plan-summary/plan-summary.component';
import { ChoiceDeclineCardComponent } from './shared/choice-decline-card/choice-decline-card.component';
import { PendingAndContractedToggleComponent } from './pending-and-contracted-toggle/pending-and-contracted-toggle.component';
import { AttributeGroupComponent } from './choice-card-detail/attribute-group/attribute-group.component';
import { LocationGroupComponent } from './choice-card-detail/location-group/location-group.component';

const moduleRoutes: Routes = [
	{
		path: 'mobile',
		component: MobileComponent,
		children: [
			{
				path: 'home',
				canActivate: [LoggedInGuard],
				component: LandingComponent,
				data: { pageLoadEvent: 'Home', buildMode: BuildMode.Buyer },
			},
			{
				path: 'home/:salesAgreementId',
				canActivate: [LoggedInGuard],
				component: LandingComponent,
				data: { pageLoadEvent: 'Home', buildMode: BuildMode.Buyer },
			},
			{
				path: 'preview',
				component: LandingComponent,
				canActivate: [LoggedInGuard],
				data: { buildMode: BuildMode.Preview },
			},
			{
				path: 'preview/:treeVersionId',
				component: LandingComponent,
				canActivate: [LoggedInGuard],
				data: { buildMode: BuildMode.Preview },
			},
			{
				path: 'presale',
				canActivate: [LoggedInGuard],
				component: LandingComponent,
				data: { pageLoadEvent: 'Home', buildMode: BuildMode.Presale },
			},
			{
				path: 'options',
				canActivate: [LoggedInGuard],
				component: OptionsComponent,
			},
			{
				path: 'options/:subGroupId',
				canActivate: [LoggedInGuard],
				component: OptionsComponent,
			},
			{
				path: 'options/:subGroupId/:decisionPointId',
				canActivate: [LoggedInGuard],
				component: OptionsComponent,
			},
			{
				path: 'options/:subGroupId/:decisionPointId/:choiceId',
				canActivate: [LoggedInGuard],
				component: ChoiceCardDetailComponent,
			},
			{
				path: 'favorites/summary',
				component: SummaryComponent,
				canActivate: [LoggedInGuard],
				data: { pageLoadEvent: 'FavoritesSummary' },
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
		ActionBarComponent,
		AttributeGroupComponent,
		ChoiceCardComponent,
		ChoiceCardDetailComponent,
		ChoiceDeclineCardComponent,
		ConfirmDialogComponent,
		EstimatedTotalsComponent,
		FloorplanImageDialogComponent,
		FloorplanImageTabsComponent,
		GlobalFooterComponent,
		GlobalHeaderComponent,
		GroupListComponent,
		HamburgerMenuComponent,
		LandingComponent,
		LocationGroupComponent,
		MobileComponent,
		OptionsComponent,
		PlanSummaryComponent,
		PendingAndContractedToggleComponent,
		SummaryAttributeLocationRowComponent,
		SummaryComponent,
		SummaryRowComponent,
		ViewOptionsLinkComponent,
	],
	imports: [
		BrowserAnimationsModule,
		CarouselModule,
		CloudinaryModule,
		CommonModule,
		FormsModule,
		MatButtonModule,
		MatCheckboxModule,
		MatDialogModule,
		MatExpansionModule,
		MatFormFieldModule,
		MatIconModule,
		MatListModule,
		MatMenuModule,
		MatSelectModule,
		MatSidenavModule,
		MatTabsModule,
		MatTooltipModule,
		NgbModule,
		PhdCommonModule,
		RouterModule.forChild(moduleRoutes),
		SharedModule,
	],
})
export class MobileModule {}
