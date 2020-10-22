import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { SharedModule } from '../shared/shared.module';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { PhdCommonModule } from 'phd-common';

import { NationalComponent } from './components/national/national.component';
import { NationalCatalogComponent } from './components/national-catalog/national-catalog.component';
import { NationalCatalogReactivateComponent } from './components/national-catalog-reactivate/national-catalog-reactivate.component';
import { NationalCatalogSidePanelComponent } from './components/national-catalog-side-panel/national-catalog-side-panel.component';

const moduleRoutes: Routes = [
    {
        path: 'national',
        canActivate: [],
        data: {},
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'national-catalog' },
            { path: 'national-catalog', component: NationalCatalogComponent }            
        ]
    }
];

@NgModule({
    declarations: [
        NationalComponent,
        NationalCatalogComponent,
        NationalCatalogReactivateComponent,
        NationalCatalogSidePanelComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        NgbModule,
		ToastModule,
		TableModule,
		PhdCommonModule,
        RouterModule.forChild(moduleRoutes)
    ],
    providers: []
})
export class NationalModule 
{

}
