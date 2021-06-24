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

@NgModule({
    declarations: [
        AutoApprovalComponent,
        CommunitySettingsComponent
    ],
    exports: [
    ],
    imports: [
        RouterModule.forChild([
            {
                path: 'community-management', canActivate: [ClaimGuard], data: { requiresClaim: 'AutoApproval' }, children: [
                    { path: 'auto-approval', data: { requiresClaim: 'AutoApproval' }, component: AutoApprovalComponent },
                    { path: 'community-settings', data: { requiresClaim: 'SalesAdmin' }, component: CommunitySettingsComponent },
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
        CheckboxModule
    ]
})
export class CommunityManagementModule { }
