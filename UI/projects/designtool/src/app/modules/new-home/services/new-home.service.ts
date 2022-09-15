import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../ngrx-store/reducers';

import * as NavActions from '../../ngrx-store/nav/actions';

import { Job, PointStatus, Scenario } from 'phd-common';
import { PhdSubMenu } from '../../new-home/subNavItems';

@Injectable()
export class NewHomeService
{
	constructor(private store: Store<fromRoot.State>)
	{

	}

	setSubNavItemsStatus(scenario: Scenario, buildMode: string, job: Job)
	{
		// 1: Name, 2: Plan, 3: Lot, 4: QMI

		let isScenarioNamed = buildMode === 'buyer' ? scenario.scenarioName.length > 0 : true;
		let isJob = job && job.id !== 0;
		let selectedPlanId = scenario.planId;
		let selectedLotId = scenario.lotId;

		// check if scenario name has already been entered
		this.setScenarioNameSubNavItemStatus(isScenarioNamed);

		this.setPlanSubNavItemStatus(selectedPlanId, isScenarioNamed, isJob);

		this.setLotSubNavItemStatus(selectedLotId, isScenarioNamed, isJob);

		this.setQMISubNavItemStatus(selectedPlanId, selectedLotId, isScenarioNamed, isJob);
	}

	private setScenarioNameSubNavItemStatus(isScenarioNamed: boolean)
	{
		let status = isScenarioNamed ? PointStatus.COMPLETED : PointStatus.REQUIRED;

		this.store.dispatch(new NavActions.SetSubNavItemStatus(PhdSubMenu.ConfigurationName, status));
	}

	private setPlanSubNavItemStatus(selectedPlanId: number, isScenarioNamed: boolean, isJob: boolean)
	{
		let status = PointStatus.CONFLICTED;

		if (isScenarioNamed)
		{
			if (isJob)
			{
				status = PointStatus.UNVIEWED;
			}
			else
			{
				status = selectedPlanId ? PointStatus.COMPLETED : PointStatus.REQUIRED;
			}
		}

		this.store.dispatch(new NavActions.SetSubNavItemStatus(PhdSubMenu.ChoosePlan, status));
	}

	private setLotSubNavItemStatus(selectedLotId: number, isScenarioNamed: boolean, isJob: boolean)
	{
		let status = PointStatus.CONFLICTED;

		if (isScenarioNamed)
		{
			if (isJob)
			{
				status = PointStatus.UNVIEWED;
			}
			else
			{
				status = selectedLotId ? PointStatus.COMPLETED : PointStatus.REQUIRED;
			}
		}

		this.store.dispatch(new NavActions.SetSubNavItemStatus(PhdSubMenu.ChooseLot, status));
	}

	private setQMISubNavItemStatus(selectedPlanId: number, selectedLotId: number, isScenarioNamed: boolean, isJob: boolean)
	{
		let status = PointStatus.CONFLICTED;

		if (isScenarioNamed)
		{
			if (isJob)
			{
				status = PointStatus.COMPLETED;
			}
			else
			{
				status = (selectedPlanId || selectedLotId) ? PointStatus.UNVIEWED : PointStatus.REQUIRED;
			}
		}

		this.store.dispatch(new NavActions.SetSubNavItemStatus(PhdSubMenu.QuickMoveIns, status));
	}
}
