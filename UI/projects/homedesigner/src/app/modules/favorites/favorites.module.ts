import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { ToastrModule } from 'ngx-toastr';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';
import { ManageFavoritesComponent } from './components/manage-favorites/manage-favorites.component';
import { MyFavoritesComponent } from './components/my-favorites/my-favorites.component';
import { NormalExperienceComponent } from './components/my-favorites/normal-experience/normal-experience.component';
import { FavoritesSummaryComponent } from './components/favorites-summary/favorites-summary.component';
import { SummaryHeaderComponent } from './components/favorites-summary/summary-header/summary-header.component';

const moduleRoutes: Routes = [
	{ path: 'favorites', component: ManageFavoritesComponent },
	{ path: 'favorites/summary', component: FavoritesSummaryComponent },
	{ path: 'favorites/my-favorites/:favoritesId/:subGroupCatalogId', component: MyFavoritesComponent },
	{ path: 'favorites/my-favorites/:favoritesId', component: MyFavoritesComponent }
];

@NgModule({
    exports: [
		ManageFavoritesComponent,
		MyFavoritesComponent,
		NormalExperienceComponent,
		FavoritesSummaryComponent,
		SummaryHeaderComponent
    ],
    declarations: [
		ManageFavoritesComponent,
		MyFavoritesComponent,
		NormalExperienceComponent,
		FavoritesSummaryComponent,
		SummaryHeaderComponent
    ],  
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		CloudinaryModule,
        SharedModule,
		PhdCommonModule,
		RouterModule.forChild(moduleRoutes),
		ToastrModule
    ],
    providers: []
})
export class FavoritesModule { }
