import { Component, Input, Output, EventEmitter } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver3 } from 'phd-common';
import { LitePlanOption, ScenarioOption, Color } from '../../../shared/models/lite.model';

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
	@Input() color: Color;
	@Input() scenarioOptions: ScenarioOption[];
	@Input() isSelected: boolean;

	@Output() toggled: EventEmitter<{option: LitePlanOption, color: Color}> = new EventEmitter();

	constructor() { super(); }

	getName(): string
	{
		return this.color ? this.color.name : this.option.name;
	}

	getButtonLabel(): string
	{
		return this.isSelected ? 'Unselect' : 'CHOOSE';
	}

	toggleSelection()
	{
		this.toggled.emit({option: this.option, color: this.color});
	}
}
