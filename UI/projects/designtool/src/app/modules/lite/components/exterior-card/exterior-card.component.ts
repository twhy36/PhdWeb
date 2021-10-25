import { Component, Input, Output, EventEmitter } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver3 } from 'phd-common';
import { LitePlanOption, ScenarioOption } from '../../../shared/models/lite.model';

@Component({
	selector: 'exterior-card',
	templateUrl: './exterior-card.component.html',
	styleUrls: ['./exterior-card.component.scss'],
	animations: [
		flipOver3
	]	
})
export class ExteriorCardComponent extends UnsubscribeOnDestroy
{
	@Input() option: LitePlanOption;
	@Input() scenarioOptions: ScenarioOption[];

	@Output() toggled: EventEmitter<LitePlanOption> = new EventEmitter();

	constructor() { super(); }

	get isOptionSelected()
	{
		return !!this.scenarioOptions.find(opt => opt.edhPlanOptionId === this.option.id && opt.planOptionQuantity > 0);
	}

	getButtonLabel(): string
	{
		return this.isOptionSelected ? 'Unselect' : 'Choose';
	}

	toggleSelection()
	{
		this.toggled.emit(this.option);
	}
}
