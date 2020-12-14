import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';
import { ManageFavoritesComponent } from './components/manage-favorites/manage-favorites.component';
import { MyFavoritesComponent } from './components/my-favorites/my-favorites.component';
import { NormalExperienceComponent } from './components/my-favorites/normal-experience/normal-experience.component';

const moduleRoutes: Routes = [
	{ path: 'favorites', component: ManageFavoritesComponent },
	{ path: 'favorites/my-favorites/:divDPointCatalogId', component: MyFavoritesComponent },
	{ path: 'favorites/my-favorites', component: MyFavoritesComponent }
];

@NgModule({
    exports: [
		ManageFavoritesComponent,
		MyFavoritesComponent,
		NormalExperienceComponent
    ],
    declarations: [
		ManageFavoritesComponent,
		MyFavoritesComponent,
		NormalExperienceComponent
    ],  
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
        SharedModule,
		PhdCommonModule,
        RouterModule.forChild(moduleRoutes),
    ],
    providers: []
})
export class FavoritesModule { }
