import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import * as fromRoot from '../../../ngrx-store/reducers';

import { ScenarioStatusType, UnsubscribeOnDestroy, Constants } from 'phd-common';
import { select, Store } from '@ngrx/store';

@Component({
	selector: 'scenario-status',
	templateUrl: './scenario-status.component.html',
	styleUrls: ['./scenario-status.component.scss']
})
export class ScenarioStatusComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() scenarioStatus: ScenarioStatusType;

	statusClass: string;
	statusText: string;
	approvedStatus: string;

	constructor(private store: Store<fromRoot.State>) { super() }

	ngOnInit()
	{
		this.setScenarioStatus(this.scenarioStatus);
	}

	ngOnChanges(changes: SimpleChanges)
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement)
		).subscribe(sag =>
		{
			this.approvedStatus = sag.status;
		});

		if (changes['scenarioStatus'])
		{
			let statusCurrent = changes['scenarioStatus'].currentValue as ScenarioStatusType;
			let statusPrevious = changes['scenarioStatus'].previousValue as ScenarioStatusType;

			if (statusCurrent != statusPrevious)
			{
				this.setScenarioStatus(statusCurrent);
			}
		}
	}

	setScenarioStatus(statusType: ScenarioStatusType)
	{
		switch (statusType)
		{
			case (ScenarioStatusType.MONOTONY_CONFLICT):
				this.statusText = 'Monotony Conflict';
				this.statusClass = 'phd-selections';

				break;
			case (ScenarioStatusType.READY_FOR_STRUCTURAL):
				this.statusText = this.approvedStatus === Constants.AGREEMENT_STATUS_APPROVED ? 'Ready To Close' : 'Ready for Sales';
				this.statusClass = this.approvedStatus === Constants.AGREEMENT_STATUS_APPROVED ? 'phd-ready-to-close' : 'phd-structural';

				break;
			case (ScenarioStatusType.READY_FOR_DESIGN):
				this.statusText = this.approvedStatus === Constants.AGREEMENT_STATUS_APPROVED ? 'Ready To Close' : 'Ready for Design';
				this.statusClass = this.approvedStatus === Constants.AGREEMENT_STATUS_APPROVED ? 'phd-ready-to-close' : 'phd-design';

				break;
			case (ScenarioStatusType.READY_TO_BUILD):
				this.statusText = 'Ready to Build';
				this.statusClass = 'phd-build';

				break;
		}
	}
}
