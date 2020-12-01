import { NgModule } from '@angular/core';
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
	imports: [],
    providers: []
})
export class SharedModule { }
