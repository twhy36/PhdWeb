import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver2, slideOut, DecisionPoint } from 'phd-common';

@Component({
	selector: 'decision-bar',
	templateUrl: './decision-bar.component.html',
	styleUrls: ['./decision-bar.component.scss'],
	animations: [
		flipOver2,
		slideOut
	]
})
export class DecisionBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() points: DecisionPoint[];
	@Input() currentPointId: number;

	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	constructor() { super(); }

	ngOnInit() {
	}

	onDecisionPointClick(point: DecisionPoint)
	{
		this.onSelectDecisionPoint.emit(point.id);
	}

	displayDecisionPoint(point: DecisionPoint) {
		if (point.isHiddenFromBuyerView) {
			return false;
		} else {
			const choices = _.flatMap(point.choices);
			let aChoiceExists = false;
			choices.forEach(c => {
				if (!c.isHiddenFromBuyerView) {
					aChoiceExists = true;
				}
			})
			return aChoiceExists;
		}
	}
}
