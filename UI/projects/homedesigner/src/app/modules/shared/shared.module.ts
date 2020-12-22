import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CloudinaryModule } from '@cloudinary/angular-5.x';

import { PhdCommonModule } from 'phd-common';

import { ActionBarComponent } from './components/action-bar/action-bar.component';
import { FloorPlanComponent } from './components/floor-plan/floor-plan.component';
import { TreeFilterComponent } from './components/tree-filter/tree-filter.component';
import { GroupBarComponent } from './components/group-bar/group-bar.component';
import { DecisionBarComponent } from './components/decision-bar/decision-bar.component';
import { ChoiceCardComponent } from './components/choice-card/choice-card.component';

@NgModule({
	exports: [
		ActionBarComponent,
		FloorPlanComponent,
		TreeFilterComponent,
		GroupBarComponent,
		DecisionBarComponent,
		ChoiceCardComponent
    ],
	declarations: [
		ActionBarComponent,
		FloorPlanComponent,
		TreeFilterComponent,
		GroupBarComponent,
		DecisionBarComponent,
		ChoiceCardComponent
    ],
	imports: [
		BrowserModule,
		BrowserAnimationsModule,
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		CloudinaryModule,
		MatMenuModule,
		MatButtonModule,
		PhdCommonModule
	],
    providers: []
})
export class SharedModule { }
