import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Store } from '@ngrx/store';

import * as _ from 'lodash';

import { PointStatus } from '../../../shared/models/point.model';
import { flipOver2, slideOut } from '../../../shared/classes/animations.class';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';

import { DecisionPoint } from '../../models/tree.model.new';
import * as fromRoot from '../../../ngrx-store/reducers';

@Component({
	selector: 'decision-bar',
	templateUrl: './decision-bar.component.html',
	styleUrls: ['./decision-bar.component.scss'],
	animations: [
		flipOver2,
		slideOut
	]
})
export class DecisionBarComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Output() onSelectDecisionPoint = new EventEmitter<number>();
	public PointStatus = PointStatus;
	@Input() decisionPoints: DecisionPoint[];
	@Input() showStatusIndicator: boolean;

	points: DecisionPoint[];

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['decisionPoints'])
		{
			let { previousValue: previous, currentValue: current } = changes['decisionPoints'] as { previousValue: DecisionPoint[], currentValue: DecisionPoint[] };

			if (current)
			{
				if (!previous || previous.length !== current.length || previous.some((p, i) => p.id !== current[i].id))
				{
					this.points = current;
				}
				else
				{
					current.forEach((pt, i) =>
					{
						Object.assign(this.points[i], pt);
					});
				}
			}
		}
	}

	ngOnInit()
	{
	}

	onDecisionPointClick(point: DecisionPoint)
	{
		this.onSelectDecisionPoint.emit(point.id);
	}
}
