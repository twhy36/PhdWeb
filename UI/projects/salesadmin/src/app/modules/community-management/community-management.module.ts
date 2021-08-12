import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
import { CommunitySettingsComponent } from './components/community-settings/community-settings.component';
import { CommunitySettingsTabComponent } from './components/community-settings-tab/community-settings-tab.component';

@NgModule({
	declarations: [
		AutoApprovalComponent,
		CommunityPdfComponent,
		CommunityPdfSidePanelComponent,
		CommunityPdfTableComponent,
		CommunitySettingsComponent,
		CommunitySettingsTabComponent
	],
	exports: [],
	imports: [
		RouterModule.forChild([
			{
				path: 'community-management', canActivate: [ClaimGuard], data: { requiresClaim: 'AutoApproval' }, children: [
					{ path: 'auto-approval', component: AutoApprovalComponent },
					{ path: 'community-pdf', component: CommunityPdfComponent },
					{ path: 'community-settings', component: CommunitySettingsComponent },
					{ path: '', redirectTo: 'community-settings', pathMatch: 'full' }
				]
			}
		]),
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
