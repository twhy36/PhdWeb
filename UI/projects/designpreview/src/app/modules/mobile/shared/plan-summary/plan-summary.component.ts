import { Component, Input, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';

@Component({
	selector: 'plan-summary',
	templateUrl: './plan-summary.component.html',
	styleUrls: ['./plan-summary.component.scss']
// eslint-disable-next-line indent
})
export class PlanSummaryComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() hideAddress: boolean = false;

	communityName: string;
	planName: string;
	lotAddress: string;
	lotNumber: string;

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	ngOnInit(): void
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName =>
		{
			this.communityName = communityName;
		});

		//get plan name
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData =>
		{
			this.planName = planData?.salesName;
		});

		//get lot for lot address when lot is not empty
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromSalesAgreement.selectSelectedLot)
		).subscribe(lot =>
		{
			if (lot && (lot.streetAddress1 && lot.streetAddress1.length)
				&& (lot.city && lot.city.length)
				&& (lot.stateProvince && lot.stateProvince.length)
				&& (lot.postalCode && lot.postalCode.length))
			{
				const address2 = lot.streetAddress2 ? ' ' + lot.streetAddress2 : '';
				this.lotAddress = `${lot.streetAddress1}${address2}, ${lot.city}, ${lot.stateProvince} ${lot.postalCode}`;
				this.lotNumber = `LOT ${lot.lotBlock}`;
			}
		});
	}
}
