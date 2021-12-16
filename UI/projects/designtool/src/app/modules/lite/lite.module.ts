import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';

import { ElevationComponent } from './components/elevation/elevation.component';
import { ColorSchemeComponent } from './components/color-scheme/color-scheme.component';
import { ExteriorCardComponent } from './components/exterior-card/exterior-card.component';
import { LiteExperienceComponent } from './components/lite-experience/lite-experience.component';
import { OptionsComponent } from './components/options/options.component';
import { ConfirmOptionRelationComponent } from './components/confirm-option-relation/confirm-option-relation.component';

const moduleRoutes: Routes = [
	{
		path: 'lite',
		component: LiteExperienceComponent,
		canActivate: [],
		data: {},
		children: [
			{ path: '', redirectTo: 'elevation', pathMatch: 'full' },
			{ path: 'elevation', component: ElevationComponent },
			{ path: 'options', component: OptionsComponent },
			{ path: 'color-scheme', component: ColorSchemeComponent }
		]
	}
];

@NgModule({
	exports: [
		ElevationComponent,
		ColorSchemeComponent,
		ExteriorCardComponent,
		LiteExperienceComponent,
		OptionsComponent,
		ConfirmOptionRelationComponent
	],
	declarations: [
		ElevationComponent,
		ColorSchemeComponent,
		ExteriorCardComponent,
		LiteExperienceComponent,
		OptionsComponent,
		ConfirmOptionRelationComponent
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
