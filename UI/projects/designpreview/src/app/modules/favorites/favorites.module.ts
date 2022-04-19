import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { ToastrModule } from 'ngx-toastr';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';
import { ExternalGuard } from '../core/guards/external.guard';
import { InternalGuard } from '../core/guards/internal.guard';
import { ManageFavoritesComponent } from './components/manage-favorites/manage-favorites.component';
import { MyFavoritesComponent } from './components/my-favorites/my-favorites.component';
import { NormalExperienceComponent } from './components/my-favorites/normal-experience/normal-experience.component';
import { FavoritesSummaryComponent } from './components/favorites-summary/favorites-summary.component';
import { ContractedSummaryComponent } from './components/contracted-summary/contracted-summary.component';
import { FloorPlanSummaryComponent } from './components/floor-plan-summary/floor-plan-summary.component';
import { SummaryHeaderComponent } from './components/favorites-summary/summary-header/summary-header.component';
import { FloorPlanExperienceComponent } from './components/my-favorites/floor-plan-experience/floor-plan-experience.component';

const moduleRoutes: Routes = [
	{
		path: '',
		children:
		[
			{ 
				path: 'favorites', 
				component: ManageFavoritesComponent, 
				canActivate: [ExternalGuard] 
			},
			{ 
				path: 'favorites/preview/:salesAgreementId', 
				component: FavoritesSummaryComponent,
				canActivate: [InternalGuard] 
			},
			{ 
				path: 'favorites/summary', 
				component: FavoritesSummaryComponent, 
				canActivate: [ExternalGuard]  
			},
			{ 
				path: 'contracted', 
				component: ContractedSummaryComponent, 
				canActivate: [ExternalGuard]  
			},
			{ 
				path: 'floorplan', 
				component: FloorPlanSummaryComponent, 
				canActivate: [ExternalGuard]  
			},
			{ 
				path: 'favorites/my-favorites/:favoritesId/:subGroupCatalogId', 
				component: MyFavoritesComponent, 
				canActivate: [ExternalGuard]  
			},
			{ 
				path: 'favorites/my-favorites/:favoritesId/:subGroupCatalogId/:divChoiceCatalogId', 
				component: MyFavoritesComponent, 
				canActivate: [ExternalGuard]  
			},
			{ 
				path: 'favorites/my-favorites/:favoritesId', 
				component: MyFavoritesComponent, 
				canActivate: [ExternalGuard]  
			}
		]
	}
];

@NgModule({
    exports: [
		ManageFavoritesComponent,
		MyFavoritesComponent,
		NormalExperienceComponent,
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
