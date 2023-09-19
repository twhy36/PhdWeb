// There is currently a bug in eslint with angular decorators and expected indentation
// For more information see this github issue: https://github.com/typescript-eslint/typescript-eslint/issues/1824
/* eslint-disable indent */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { CloudinaryModule } from '@cloudinary/ng';

import { PhdCommonModule } from 'phd-common';
import { ExternalGuard } from '../core/guards/external.guard';
import { InternalGuard } from '../core/guards/internal.guard';
import { SharedModule } from '../shared/shared.module';
import { HomeComponent } from './components/home/home.component';
import { CoreModule } from '../core/core.module';
import { PresaleGuard } from '../core/guards/presale.guard';
import { BuildMode } from '../shared/models/build-mode.model';
import { MatIconModule } from '@angular/material/icon';
import { FooterBarComponent } from '../shared/components/footer-bar/footer-bar.component';

// Temporarily add salesAgreementId in the route to facilitate testing in QA environment.
// This will be removed once the SSO code is incorporated.
const moduleRoutes: Routes = [
	{
		path: 'home/:salesAgreementId',
		canActivate: [InternalGuard],
		component: HomeComponent,
		data: { pageLoadEvent: 'Home', buildMode: BuildMode.Buyer },
	},
	{
		path: 'home',
		canActivate: [ExternalGuard],
		component: HomeComponent,
		data: { pageLoadEvent: 'Home', buildMode: BuildMode.Buyer },
	},
	{
		path: 'preview/:treeVersionId',
		component: HomeComponent,
		canActivate: [InternalGuard],
		data: { buildMode: BuildMode.Preview },
	},
	{
		path: 'preview',
		component: HomeComponent,
		canActivate: [InternalGuard],
		data: { buildMode: BuildMode.Buyer },
	},
	{
		path: 'presale',
		component: HomeComponent,
		canActivate: [PresaleGuard],
		data: { pageLoadEvent: 'Home', buildMode: BuildMode.Presale },
	},
];

@NgModule({
	exports: [
	HomeComponent
	],
	declarations: [
	HomeComponent
	],
	imports: [
	CommonModule,
	CloudinaryModule,
	SharedModule,
	CoreModule,
	MatIconModule,
	PhdCommonModule,
	RouterModule.forChild(moduleRoutes),
	],
	providers: []
	})
export class HomeModule { }
