import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { CloudinaryModule } from '@cloudinary/angular-5.x';

import { SharedModule } from '../shared/shared.module';
import { PageNotFoundComponent } from '../shared/components/page-not-found/page-not-found.component';

import { PhdCommonModule } from 'phd-common';

import { LotComponent } from './components/lot/lot.component';
import { NameScenarioComponent } from './components/name-scenario/name-scenario.component';
import { NewHomeComponent } from './components/new-home/new-home.component';
import { PlanContainerComponent } from './components/plan-container/plan-container.component';
import { QuickMoveInComponent } from './components/quick-move-in/quick-move-in.component';
import { QuickMoveInCardComponent } from './components/quick-move-in-card/quick-move-in-card.component';

const moduleRoutes: Routes = [
    {
		path: 'new-home',
		component: NewHomeComponent,
        canActivate: [],
        data: {},
		children: [
			{ path: 'name-scenario/:opportunityId', component: NameScenarioComponent, data: { isSpec: false }, canActivate: [] },
			{ path: 'name-scenario', component: NameScenarioComponent, data: { isSpec: false }, canActivate: [] },
			{ path: 'lot', component: LotComponent, data: { isSpec: false } },
			{ path: 'plan', component: PlanContainerComponent, data: { isSpec: false } },
			{ path: 'quick-move-in', component: QuickMoveInComponent },
			{ path: 'spec/:marketid/:communityid', component: NewHomeComponent, data: { buildMode: 'spec' }},
			{ path: 'model/:marketid/:communityid', component: NewHomeComponent, data: { buildMode: 'model' }},
            { path: '**', component: PageNotFoundComponent }
        ]
    }
];

@NgModule({
    declarations: [
		NameScenarioComponent,
		NewHomeComponent,
		LotComponent,
		QuickMoveInComponent,
		QuickMoveInCardComponent,
		PlanContainerComponent
    ],
	imports: [
		NgbModule,
        CommonModule,
		FormsModule,
		ReactiveFormsModule,
		CloudinaryModule,
        SharedModule,
		RouterModule.forChild(moduleRoutes),
		PhdCommonModule
    ],
    providers: []
})
export class NewHomeModule 
{

}
