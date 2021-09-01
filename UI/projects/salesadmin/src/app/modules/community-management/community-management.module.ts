import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { CalendarModule } from 'primeng/calendar';

import { PhdCommonModule } from 'phd-common';
import { ClaimGuard } from 'phd-common';
import { SharedModule } from '../shared/shared.module';
import { LotManagementModule } from '../lot-managment/lot-management.module';
import { AutoApprovalComponent } from './components/auto-approvals/auto-approvals.component';
import { CommunityPdfComponent } from './components/community-pdf/community-pdf.component';
import { CommunityPdfSidePanelComponent } from './components/community-pdf-side-panel/community-pdf-side-panel.component';
import { CommunityPdfTableComponent } from './components/community-pdf-table/community-pdf-table.component';
import { CommunityManagementComponent } from './components/community-management/community-management.component';
import { CommunitySettingsTabComponent } from './components/community-settings/community-settings.component';
import { MonotonyOptionsComponent } from '../lot-managment/components/monotony-options/monotony-options.component';

const moduleRoutes: Routes = [
	{
		path: 'community-management',
		component: CommunityManagementComponent,
		canActivate: [ClaimGuard],
		data: { requiresClaim: 'AutoApproval' },
		children: [
			{ path: 'auto-approval', component: AutoApprovalComponent },
			{ path: 'community-pdf', component: CommunityPdfComponent, canActivate: [ClaimGuard], data: { requiresClaim: 'SalesAdmin'} },
			{ path: 'community-settings', component: CommunitySettingsTabComponent, canActivate: [ClaimGuard], data: { requiresClaim: 'SalesAdmin'} },
			{ path: 'monotony-options', component: MonotonyOptionsComponent, canActivate: [ClaimGuard], data: { requiresClaim: 'SalesAdmin'} },
			{ path: '', redirectTo: 'auto-approval', pathMatch: 'full' }
		]
	}
]

@NgModule({
	declarations: [
		AutoApprovalComponent,
		CommunityPdfComponent,
		CommunityPdfSidePanelComponent,
		CommunityPdfTableComponent,
		CommunityManagementComponent,
		CommunitySettingsTabComponent
	],
	exports: [],
	imports: [
		RouterModule.forChild(moduleRoutes),
		SharedModule,
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		ToastModule,
		PhdCommonModule,
		CheckboxModule,
		LotManagementModule,
		CalendarModule
	]
})
export class CommunityManagementModule { }
