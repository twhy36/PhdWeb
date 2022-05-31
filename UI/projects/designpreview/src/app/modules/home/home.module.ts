import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { CloudinaryModule } from '@cloudinary/angular-5.x';

import { PhdCommonModule } from 'phd-common';
import { ExternalGuard } from '../core/guards/external.guard';
import { InternalGuard } from '../core/guards/internal.guard';
import { SharedModule } from '../shared/shared.module';
import { HomeComponent } from './components/home/home.component';
import { BannerComponent } from './components/home/banner/banner.component';

// Temporarily add salesAgreementId in the route to facilitate testing in QA environment.
// This will be removed once the SSO code is incorporated.
const moduleRoutes: Routes = [
	{
		path: 'home/:salesAgreementId',
		canActivate: [InternalGuard],
		component: HomeComponent,
		data: { isPreview: false, pageLoadEvent: 'Home' },
	},
	{
		path: 'home',
		canActivate: [ExternalGuard],
		component: HomeComponent,
		data: { isPreview: false, pageLoadEvent: 'Home' },
	},
	{
		path: 'preview/:treeVersionId',
		component: HomeComponent,
		canActivate: [InternalGuard],
		data: { isPreview: true },
	}
];

@NgModule({
    exports: [
		HomeComponent,
		BannerComponent
    ],
    declarations: [
		HomeComponent,
		BannerComponent
    ],
	imports: [
		CommonModule,
		CloudinaryModule,
		SharedModule,
		PhdCommonModule,
        RouterModule.forChild(moduleRoutes),
    ],
    providers: []
})
export class HomeModule { }
