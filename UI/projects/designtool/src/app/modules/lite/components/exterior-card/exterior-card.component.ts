import { Component, Input, Output, EventEmitter } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver3 } from 'phd-common';
import { LitePlanOption } from '../../../shared/models/lite.model';

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

	@Output() toggled: EventEmitter<LitePlanOption> = new EventEmitter();

	constructor() { super(); }

	getButtonLabel(): string
	{
		return this.option?.scenarioOption?.planOptionQuantity
			? 'Unselect'
			: 'Choose';
	}

	toggleSelection()
	{
		this.toggled.emit(this.option);
	}
}
