import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { CalendarModule } from 'primeng/calendar';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';

import { ConfirmNavigationGuard } from '../core/guards/confirm-navigation.guard';
import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { NormalExperienceComponent } from './components/edit-home/normal-experience/normal-experience.component';
import { FloorPlanComponent } from './components/edit-home/floor-plan/floor-plan.component';
import { EditHomeComponent } from './components/edit-home/edit-home.component';
import { DragScrollModule } from 'ngx-drag-scroll';
import { FloorOptionsPipe } from './pipes/floor-options.pipe';
import { PulteInfoComponent } from './components/pulte-info/pulte-info.component';

const moduleRoutes: Routes = [
	{
		path: 'edit-home/:scenarioId/:divDPointCatalogId',
		component: EditHomeComponent,
		canActivate: [],
		data: { isPreview: false },
		children: []
	},
	{
		path: 'edit-home/:scenarioId/:divDPointCatalogId/:choiceId',
		component: EditHomeComponent,
		canActivate: [],
		data: { isPreview: false },
		children: []
	},
    {
        path: 'edit-home/:scenarioId',
        component: EditHomeComponent,
        canActivate: [],
        data: { isPreview: false },
        children: []
    },
    {
        path: 'preview/:treeVersionId',
        component: EditHomeComponent,
        canActivate: [],
        data: { isPreview: true },
		children: []
    },
    {
        path: 'spec/:jobId',
        component: PulteInfoComponent,
        canDeactivate: [ConfirmNavigationGuard]
    },
    {
        path: 'spec/:jobId/:changeOrder',
        component: PulteInfoComponent,
        canDeactivate: [ConfirmNavigationGuard]
    }
];

@NgModule({
    exports: [
        NormalExperienceComponent,
		FloorPlanComponent,
        EditHomeComponent,
        PulteInfoComponent
    ],
    declarations: [
        NormalExperienceComponent,
		FloorPlanComponent,
        EditHomeComponent,
        FloorOptionsPipe,
        PulteInfoComponent
    ],
	imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        CalendarModule,
		DragScrollModule,
		PhdCommonModule,
        RouterModule.forChild(moduleRoutes),
        CloudinaryModule
    ],
    providers: []
})
export class EditHomeModule 
{

}
