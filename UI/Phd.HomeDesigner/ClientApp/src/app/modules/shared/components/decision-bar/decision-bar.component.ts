import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';
import { flipOver2, slideOut } from 'phd-common/classes/animations.class';

import { DecisionPoint } from '../../models/tree.model';

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
	@Input() points$: Observable<DecisionPoint[]>;
	@Input() currentPointId$: Observable<number>;

	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	constructor() { super(); }

	ngOnInit() {
	}

	onDecisionPointClick(point: DecisionPoint)
	{
		this.onSelectDecisionPoint.emit(point.id);
	}
}
