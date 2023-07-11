import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterModule, Routes } from '@angular/router';

// Mobile Module
import { MobileComponent } from './mobile.component';
import { LandingComponent } from './landing/landing.component';

// External Modules
import { BuildMode } from '../shared/models/build-mode.model';
import { ExternalGuard } from '../core/guards/external.guard';
import { InternalGuard } from '../core/guards/internal.guard';
import { PresaleGuard } from '../core/guards/presale.guard';

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
	LandingComponent,
	MobileComponent
	],
	imports: [
	CommonModule,
	MatButtonModule,
	MatIconModule,
	MatMenuModule,
	MatSidenavModule,
	RouterModule.forChild(moduleRoutes)
	]
	})
export class MobileModule { }
