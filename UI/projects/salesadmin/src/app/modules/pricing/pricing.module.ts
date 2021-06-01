import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { PhdCommonModule } from 'phd-common';
import { SharedModule } from '../shared/shared.module';
import { PricingComponent } from './components/pricing.component';
import { PhasePricingComponent } from './components/phase-pricing/phase-pricing.component';
import { PhasePricingSidePanelComponent } from './components/phase-pricing-side-panel/phase-pricing-side-panel.component';
import { PlanPhasesPipe } from './pipes/plan-phases.pipe';
import { CanDeactivateGuard, ClaimGuard } from 'phd-common';


@NgModule({
    declarations: [
        PricingComponent,
		PhasePricingComponent,
		PhasePricingSidePanelComponent,
        PlanPhasesPipe
    ],
    exports: [
        PricingComponent,
        PhasePricingComponent
    ],
    imports: [
        RouterModule.forChild([
            {
				path: 'pricing', component: PricingComponent, canActivate: [ClaimGuard], data: { requiresClaim: 'SalesAdmin' }, children: [
					{ path: 'phase-pricing', component: PhasePricingComponent, canDeactivate: [CanDeactivateGuard] },
                    { path: '', redirectTo: 'phase-pricing', pathMatch: 'full' }
                ]
            }
        ]),
        FormsModule,
		ReactiveFormsModule,
        SharedModule,
        CommonModule,
        PhdCommonModule,

        NgbModule
    ]
})
export class PricingModule { }
