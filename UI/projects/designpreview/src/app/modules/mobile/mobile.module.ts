import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterModule, Routes } from '@angular/router';

// External Modules
import { BuildMode } from '../shared/models/build-mode.model';
import { ExternalGuard } from '../core/guards/external.guard';
import { InternalGuard } from '../core/guards/internal.guard';
import { PresaleGuard } from '../core/guards/presale.guard';

// Mobile Module
import { MobileComponent } from './mobile.component';
import { GlobalHeaderComponent } from './global-header/global-header.component';
import { HamburgerMenuComponent } from './hamburger-menu/hamburger-menu.component';
import { LandingComponent } from './landing/landing.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';

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
			{ path: 'error', component: LandingComponent },
			{ path: '**', pathMatch: 'full', redirectTo: '' },
			{ path: '', component: LandingComponent }
		]
	},
];

@NgModule({
	exports: [
	LandingComponent
	],
	declarations: [
	MobileComponent,
	GlobalHeaderComponent,
	HamburgerMenuComponent,
	LandingComponent,
	ConfirmDialogComponent
	],
	imports: [
	CommonModule,
	MatButtonModule,
	MatDialogModule,
	MatExpansionModule,
	MatIconModule,
	MatMenuModule,
	MatSidenavModule,
	RouterModule.forChild(moduleRoutes)
	]
	})
export class MobileModule { }
