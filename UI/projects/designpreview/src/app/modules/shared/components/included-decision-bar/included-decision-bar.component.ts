import { Component, Input, Output, EventEmitter } from '@angular/core';

import * as _ from 'lodash';
import { UnsubscribeOnDestroy, flipOver2, slideOut, DecisionPoint, TreeVersion, SubGroup } from 'phd-common';

@Component({
	selector: 'included-decision-bar',
	templateUrl: './included-decision-bar.component.html',
	styleUrls: ['./included-decision-bar.component.scss'],
	animations: [
		flipOver2,
		slideOut
	]
})
export class IncludedDecisionBarComponent extends UnsubscribeOnDestroy
{
	@Input() points: DecisionPoint[];
	@Input() tree: TreeVersion;

	@Output() selectDecisionPoint = new EventEmitter<number>();
	@Output() selectSubGroup = new EventEmitter<number>();
	
	currentPointId: number;
	currentSubGroupId: number;

	constructor() { super(); }

	onDecisionPointClick(point: DecisionPoint)
	{
		this.currentPointId = point.id;
		this.currentSubGroupId = null;
		this.selectSubGroup.emit(null);
		this.selectDecisionPoint.emit(point.id);
	}

	onSubGroupClick(subGroup: SubGroup) 
	{
		this.currentSubGroupId = subGroup.id;
		this.currentPointId = null;
		this.selectDecisionPoint.emit(null);
		this.selectSubGroup.emit(subGroup.id);
	}

	displaySubGroup(subGroup: SubGroup) 
	{
		let display = false;
		subGroup.points.forEach(p => 
		{
			if (this.displayDecisionPoint(p)) 
			{
				display = true;
			}
		})
		return display;
	}

	displayDecisionPoint(point: DecisionPoint) 
	{
		if (point.isHiddenFromBuyerView) 
		{
			return false;
		}
		else 
		{
			const choices = _.flatMap(point.choices);
			let aChoiceExists = false;
			choices.forEach(c => 
			{
				if (!c.isHiddenFromBuyerView && c.isDecisionDefault) 
				{
					aChoiceExists = true;
				}
			})
			return aChoiceExists;
		}
	}
}
