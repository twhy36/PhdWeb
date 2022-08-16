import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
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
export class IncludedDecisionBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() points: DecisionPoint[];
	@Input() tree: TreeVersion;

	@Output() onSelectDecisionPoint = new EventEmitter<number>();
	
	currentPointId: number;

	constructor() { super(); }

	ngOnInit() { }

	onDecisionPointClick(point: DecisionPoint)
	{
		this.currentPointId = point.id;
		this.onSelectDecisionPoint.emit(point.id);
	}

	displaySubGroup(subGroup: SubGroup) {
		let display = false;
		subGroup.points.forEach(p => {
			if (this.displayDecisionPoint(p)) {
				display = true;
			}
		})
		return display;
	}

	displayDecisionPoint(point: DecisionPoint) {
		if (point.isHiddenFromBuyerView) {
			return false;
		} else {
			const choices = _.flatMap(point.choices);
			let aChoiceExists = false;
			choices.forEach(c => {
				if (!c.isHiddenFromBuyerView && c.isDecisionDefault) {
					aChoiceExists = true;
				}
			})
			return aChoiceExists;
		}
	}
}
