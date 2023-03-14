import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { ToastrModule } from 'ngx-toastr';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';
import { InternalGuard } from '../core/guards/internal.guard';
import { ManageFavoritesComponent } from './components/manage-favorites/manage-favorites.component';
import { MyFavoritesComponent } from './components/my-favorites/my-favorites.component';
import { NormalExperienceComponent } from './components/my-favorites/normal-experience/normal-experience.component';
import { IncludedOptionsComponent } from './components/included-options/included-options.component';
import { FavoritesSummaryComponent } from './components/favorites-summary/favorites-summary.component';
import { ContractedSummaryComponent } from './components/contracted-summary/contracted-summary.component';
import { FloorPlanSummaryComponent } from './components/floor-plan-summary/floor-plan-summary.component';
import { SummaryHeaderComponent } from './components/favorites-summary/summary-header/summary-header.component';
import { FloorPlanExperienceComponent } from './components/my-favorites/floor-plan-experience/floor-plan-experience.component';
import { LoggedInGuard } from '../core/guards/logged-in.guard';
import { BuildMode } from '../shared/models/build-mode.model';

const moduleRoutes: Routes = [
	{
		path: '',
		children:
			[
				{
					path: 'favorites',
					component: ManageFavoritesComponent,
					canActivate: [LoggedInGuard]
				},
				{
					path: 'favorites/preview/:salesAgreementId',
					component: FavoritesSummaryComponent,
					canActivate: [InternalGuard],
					data: { buildMode: BuildMode.BuyerPreview }
				},
				{
					path: 'favorites/summary',
					component: FavoritesSummaryComponent,
					canActivate: [LoggedInGuard],
					data: { pageLoadEvent: 'FavoritesSummary' }
				},
				{
					path: 'contracted',
					component: ContractedSummaryComponent,
					canActivate: [LoggedInGuard],
					data: { pageLoadEvent: 'ContractedSummary' }
				},
				{
					path: 'floorplan',
					component: FloorPlanSummaryComponent,
					canActivate: [LoggedInGuard],
					data: { pageLoadEvent: 'FloorplanSummary' }
				},
				{
					path: 'included',
					component: IncludedOptionsComponent,
					canActivate: [LoggedInGuard],
					data: { pageLoadEvent: 'IncludedOptions' }
				},
				{
					path: 'favorites/my-favorites/:favoritesId/:subGroupCatalogId',
					component: MyFavoritesComponent,
					canActivate: [LoggedInGuard],
					data: { pageLoadEvent: 'ChoiceCard' }
				},
				{
					path: 'favorites/my-favorites/:favoritesId/:subGroupCatalogId/:divChoiceCatalogId',
					component: MyFavoritesComponent,
					canActivate: [LoggedInGuard],
					data: { pageLoadEvent: 'ChoiceDetail' }
				},
				{
					path: 'favorites/my-favorites/:favoritesId',
					component: MyFavoritesComponent,
					canActivate: [LoggedInGuard],
					data: { pageLoadEvent: 'ChoiceCard' }
				}
			]
	}
];

@NgModule({
	exports: [
		ManageFavoritesComponent,
		MyFavoritesComponent,
		NormalExperienceComponent,
		IncludedOptionsComponent,
		FavoritesSummaryComponent,
		ContractedSummaryComponent,
		FloorPlanSummaryComponent,
		SummaryHeaderComponent,
		FloorPlanExperienceComponent
	],
	declarations: [
		ManageFavoritesComponent,
		MyFavoritesComponent,
		NormalExperienceComponent,
		IncludedOptionsComponent,
		FavoritesSummaryComponent,
		ContractedSummaryComponent,
		FloorPlanSummaryComponent,
		SummaryHeaderComponent,
		FloorPlanExperienceComponent
	],
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		CloudinaryModule,
		SharedModule,
		PhdCommonModule,
		RouterModule.forChild(moduleRoutes),
		ToastrModule,
		NgbModule
	],
	providers: []
})
export class FavoritesModule { }
