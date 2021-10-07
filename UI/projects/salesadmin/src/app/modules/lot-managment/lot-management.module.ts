import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { CalendarModule } from 'primeng/calendar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ManageHomesitesComponent } from './components/manage-homesites/manage-homesites.component';
import { ManageHomesitesSidePanelComponent } from './components/manage-homesites-side-panel/manage-homesites-side-panel.component';
import { PlanAssignmentComponent } from './components/plan-assignment/plan-assignment.component';
import { PlanAssignmentSidePanelComponent } from './components/plan-assignment-side-panel/plan-assignment-side-panel.component';
import { ReleasesComponent } from './components/releases/releases.component';
import { ReleasesSidePanelComponent } from './components/releases-side-panel/releases-side-panel.component';
import { LotManagementComponent } from './components/lot-management/lot-management.component';
import { SalesProgramsComponent } from './components/sales-programs/sales-programs.component';
import { SalesProgramsSidePanelComponent } from './components/sales-programs-side-panel/sales-programs-side-panel.component';
import { MonotonyOptionsComponent } from './components/monotony-options/monotony-options.component';
import { CanDeactivateGuard, ClaimGuard } from 'phd-common';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MultiSelectModule } from 'primeng/multiselect';
import { AvSitePlanComponent } from './components/av-site-plan/av-site-plan.component';
import { LotRelationshipsComponent } from './components/lot-relationships/lot-relationships.component';
import { LotRelationshipsSidePanelComponent } from './components/lot-relationships-side-panel/lot-relationships-side-panel.component';
import { PlanManagementComponent } from './components/plan-management/plan-management.component';

const moduleRoutes: Routes = [
    {
        path: 'lot-management',
        component: LotManagementComponent,
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'manage-homesites' },
			{ path: 'manage-homesites', component: ManageHomesitesComponent, canDeactivate: [CanDeactivateGuard], canActivate: [ClaimGuard], data: { requiresClaim: 'SalesAdmin'} },
			{ path: 'plan-management', component: PlanManagementComponent, children: [
                { path: 'lot-relationships', component: LotRelationshipsComponent, canActivate: [ClaimGuard], data: { requiresClaim: 'LotRelationships'} },
                { path: 'plan-assignment', component: PlanAssignmentComponent, canActivate: [ClaimGuard], data: { requiresClaim: 'SalesAdmin'} },
                { path: '', pathMatch: 'full', redirectTo: 'plan-assignment' },
            ]},
			{ path: 'releases', component: ReleasesComponent, canDeactivate: [CanDeactivateGuard], canActivate: [ClaimGuard], data: { requiresClaim: 'SalesAdmin'} },
			{ path: 'sales-programs', component: SalesProgramsComponent, canDeactivate: [CanDeactivateGuard], canActivate: [ClaimGuard], data: { requiresClaim: 'SalesAdmin'} },
			{ path: 'monotony-options', component: MonotonyOptionsComponent, canActivate: [ClaimGuard], data: { requiresClaim: 'SalesAdmin'} }
        ]
    }
];

@NgModule({
    exports: [
        MonotonyOptionsComponent
    ],
    declarations: [
        LotManagementComponent,
        LotRelationshipsComponent,
        LotRelationshipsSidePanelComponent,
        ManageHomesitesComponent,
        ManageHomesitesSidePanelComponent,
        PlanAssignmentComponent,
        PlanAssignmentSidePanelComponent,
        PlanManagementComponent,
        ReleasesComponent,
        ReleasesSidePanelComponent,
        SalesProgramsComponent,
        SalesProgramsSidePanelComponent,
        MonotonyOptionsComponent,
        AvSitePlanComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CalendarModule,
        ConfirmDialogModule,
		ToastModule,
        SharedModule,
        PhdCommonModule,
        TableModule,
		NgbModule,
		RouterModule.forChild(moduleRoutes),
		InfiniteScrollModule,
		MultiSelectModule
    ],
    providers: []
})
export class LotManagementModule
{

}
