import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';

import { ChangeOrdersComponent } from './change-orders/change-orders.component';
import { ChangeOrderSummaryComponent } from './change-order-summary/change-order-summary.component';
import { ChangeOrderTableComponent } from './change-order-table/change-order-table.component';
import { NonStandardChangeComponent } from './non-standard-change/non-standard-change.component';
import { LotTransferComponent } from './lot-transfer/lot-transfer.component';
import { PlanChangeComponent } from './plan-change/plan-change.component';

const moduleRoutes: Routes = [
	{
		path: 'change-orders',
		component: ChangeOrdersComponent,
		canActivate: [],
		data: {},
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'change-orders-summary' },
			{ path: 'change-orders-summary', component: ChangeOrderSummaryComponent },
			{ path: 'change-orders-summary/:spec/:id', component: ChangeOrderSummaryComponent },
			{ path: 'plan-change', component: PlanChangeComponent },
			{ path: 'lot-transfer', component: LotTransferComponent },
			{ path: 'non-standard', component: NonStandardChangeComponent }
		]
	}
];

@NgModule({
	declarations: [
		ChangeOrdersComponent,
		ChangeOrderSummaryComponent,
		ChangeOrderTableComponent,
		NonStandardChangeComponent,
		LotTransferComponent,
		PlanChangeComponent
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

export class ChangeOrdersModule
{

}
