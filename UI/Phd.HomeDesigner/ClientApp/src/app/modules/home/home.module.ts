import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { CloudinaryModule } from '@cloudinary/angular-5.x';

import { SharedModule } from '../shared/shared.module';
import { HomeComponent } from './components/home/home.component';

// Temporarily add salesAgreementId in the route to facilitate testing in QA environment.
// This will be removed once the SSO code is incorporated.
const moduleRoutes: Routes = [
	{
		path: 'home/:salesAgreementId',
		component: HomeComponent
	},
	{
		path: 'home',
		component: HomeComponent
	}
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
        RouterModule.forChild(moduleRoutes),
    ],
    providers: []
})
export class HomeModule { }
