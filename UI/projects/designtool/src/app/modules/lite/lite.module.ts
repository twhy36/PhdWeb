import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';

import { ElevationComponent } from './components/elevation/elevation.component';
import { ExteriorCardComponent } from './components/exterior-card/exterior-card.component';
import { LiteExperienceComponent } from './components/lite-experience/lite-experience.component';

const moduleRoutes: Routes = [
	{
		path: 'lite',
		component: LiteExperienceComponent,
		canActivate: [],
		data: {},
		children: [
			{ path: '', redirectTo: 'elevation', pathMatch: 'full' },
			{ path: 'elevation', component: ElevationComponent }		
		]
	}
];

@NgModule({
	exports: [
		ElevationComponent,
		ExteriorCardComponent,
		LiteExperienceComponent
	],
	declarations: [
		ElevationComponent,
		ExteriorCardComponent,
		LiteExperienceComponent
	],
	imports: [
		CommonModule,
		FormsModule,
		CloudinaryModule,
		ReactiveFormsModule,
		SharedModule,
		NgbModule,
		PhdCommonModule,
		RouterModule.forChild(moduleRoutes)
	],
	providers: []
})

export class LiteModule { }
