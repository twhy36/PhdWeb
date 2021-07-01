import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';

import { PhdCommonModule } from 'phd-common';
import { SharedModule } from '../shared/shared.module';
import { AutoApprovalComponent } from './auto-approvals/auto-approvals.component';
import { CommunitySettingsComponent } from './community-settings/community-settings.component';
import { ClaimGuard } from 'phd-common';
import { LotManagementModule } from '../lot-managment/lot-management.module';
import { CommunitySettingsTabComponent } from './community-settings-tab/community-settings-tab.component';

@NgModule({
    declarations: [
        AutoApprovalComponent,
		CommunitySettingsComponent,
		CommunitySettingsTabComponent
    ],
    exports: [
    ],
    imports: [
        RouterModule.forChild([
            {
                path: 'community-management', canActivate: [ClaimGuard], data: { requiresClaim: 'AutoApproval' }, children: [
                    { path: 'auto-approval', component: AutoApprovalComponent },
					{ path: 'community-settings', component: CommunitySettingsComponent },
					{ path: 'community-settings-tab', component: CommunitySettingsTabComponent },
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
        LotManagementModule
    ]
})
export class CommunityManagementModule { }
