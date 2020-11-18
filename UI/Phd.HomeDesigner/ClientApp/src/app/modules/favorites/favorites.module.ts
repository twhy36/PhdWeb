import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';
import { ManageFavoritesComponent } from './components/manage-favorites/manage-favorites.component';

const moduleRoutes: Routes = [
	{ path: 'favorites', component: ManageFavoritesComponent }
];

@NgModule({
    exports: [
		ManageFavoritesComponent
    ],
    declarations: [
		ManageFavoritesComponent
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
