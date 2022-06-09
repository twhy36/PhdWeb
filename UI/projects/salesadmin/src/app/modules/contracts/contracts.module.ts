import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AutoCompleteModule } from 'primeng/autocomplete';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';

import { ContractsComponent } from './components/contracts/contracts.component';
import { ViewContractsComponent } from './components/view-contracts/view-contracts.component';
import { ViewContractsSidePanelComponent } from './components/view-contracts-side-panel/view-contracts-side-panel.component';
import { MergeFieldsComponent } from './components/merge-fields/merge-fields.component';
import { MergeFieldsSidePanelComponent } from './components/merge-fields-side-panel/merge-fields-side-panel.component';
import { SignFieldsComponent } from './components/sign-fields/sign-fields.component';
import { CanDeactivateGuard, ClaimGuard } from 'phd-common';

const moduleRoutes: Routes = [
	{
		path: 'contracts',
		component: ContractsComponent,
		canActivate: [ClaimGuard],
		data: { requiresClaim: 'ContractTemplates' },
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'view-contracts' },
			{ path: 'view-contracts', component: ViewContractsComponent, canDeactivate: [CanDeactivateGuard] },
			{ path: 'merge-fields', component: MergeFieldsComponent, canDeactivate: [CanDeactivateGuard] },
			{ path: 'sign-fields', component: SignFieldsComponent, canDeactivate: [CanDeactivateGuard] }
		]
	}
];

@NgModule({
	declarations: [
		ContractsComponent,
		ViewContractsComponent,
		ViewContractsSidePanelComponent,
		MergeFieldsComponent,
		MergeFieldsSidePanelComponent,
		SignFieldsComponent
	],
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		ToastModule,
		SharedModule,
		PhdCommonModule,
		TableModule,
		CalendarModule,
		NgbModule,
		AutoCompleteModule,
		RouterModule.forChild(moduleRoutes)
	],
	providers: []
})
export class ContractsModule
{

}
