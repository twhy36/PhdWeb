import { Component, OnInit, Input, SimpleChanges } from '@angular/core';

import { ScenarioStatusType } from 'phd-common';

@Component({
	selector: 'scenario-status',
	templateUrl: './scenario-status.component.html',
	styleUrls: ['./scenario-status.component.scss']
})
export class ScenarioStatusComponent implements OnInit
{
	@Input() scenarioStatus: ScenarioStatusType;

	statusClass: string;
	statusText: string;

	constructor() { }

	ngOnInit()
	{
		this.setScenarioStatus(this.scenarioStatus);
	}

	ngOnChanges(changes: SimpleChanges)
	{
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
				this.statusText = 'Ready for Sales';
				this.statusClass = 'phd-structural';

				break;
			case (ScenarioStatusType.READY_FOR_DESIGN):
				this.statusText = 'Ready for Design';
				this.statusClass = 'phd-design';

				break;
			case (ScenarioStatusType.READY_TO_BUILD):
				this.statusText = 'Ready to Build';
				this.statusClass = 'phd-build';

				break;
		}
	}
}
