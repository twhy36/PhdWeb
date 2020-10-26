import { NgModule } from '@angular/core';
import { FloorPlanComponent } from './components/floor-plan/floor-plan.component';

@NgModule({
    exports: [
		FloorPlanComponent
    ],
    declarations: [
		FloorPlanComponent
    ],
	imports: [],
    providers: []
})
export class SharedModule { }
