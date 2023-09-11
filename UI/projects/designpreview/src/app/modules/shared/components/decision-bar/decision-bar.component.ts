import { Component, Input, Output, EventEmitter } from '@angular/core';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver2, slideOut, DecisionPoint } from 'phd-common';
import { pointTrackBy } from '../../classes/utils.class';

@Component({
	selector: 'decision-bar',
	templateUrl: './decision-bar.component.html',
	styleUrls: ['./decision-bar.component.scss'],
	animations: [
	flipOver2,
	slideOut
	]
	})
export class DecisionBarComponent extends UnsubscribeOnDestroy
{
	@Input() points: DecisionPoint[];
	@Input() currentPointId: number;

	@Output() selectDecisionPoint = new EventEmitter<number>();

	constructor() { super(); }

	onDecisionPointClick(point: DecisionPoint)
	{
		this.selectDecisionPoint.emit(point.id);
	}

	displayDecisionPoint(point: DecisionPoint) 
	{
		if (point.isHiddenFromBuyerView) 
		{
			return false;
		}
		
		return point?.choices?.some(c => !c.isHiddenFromBuyerView) ?? false;
	}

	getPointCardId(point: DecisionPoint) 
	{
		return `#point-card-${point.id?.toString()}`
	}

	pointTrackBy = pointTrackBy;
}
