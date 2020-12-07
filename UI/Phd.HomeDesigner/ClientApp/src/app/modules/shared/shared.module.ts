import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionBarComponent } from './components/action-bar/action-bar.component';
import { FloorPlanComponent } from './components/floor-plan/floor-plan.component';

@NgModule({
	exports: [
		ActionBarComponent,
		FloorPlanComponent
    ],
	declarations: [
		ActionBarComponent,
		FloorPlanComponent
    ],
	imports: [
		CommonModule
	],
    providers: []
})
export class SharedModule { }
