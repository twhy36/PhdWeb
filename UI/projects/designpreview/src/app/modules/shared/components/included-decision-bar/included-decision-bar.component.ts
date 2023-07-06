import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Store, select } from '@ngrx/store';

import * as _ from 'lodash';
import * as fromRoot from '../../../ngrx-store/reducers';
import { UnsubscribeOnDestroy, flipOver2, slideOut, DecisionPoint, TreeVersion, SubGroup, Group } from 'phd-common';

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

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit() 
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav)
		).subscribe((nav) =>
		{
			this.currentPointId = nav.includedPoint;
			this.currentSubGroupId = nav.includedSubGroup;
		});
	}

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

	getPointLabelId(point: DecisionPoint)
	{
		return `#included-point-${point.id?.toString()}`
	}

	getSubGroupLabelId(subGroup: SubGroup)
	{
		return `#included-subgroup-${subGroup.id?.toString()}`
	}

	groupUpdated(group: Group)
	{
		return group.groupCatalogId;
	}

	subGroupUpdated(subGroup: SubGroup)
	{
		return subGroup.subGroupCatalogId;
	}

	pointUpdated(point: DecisionPoint) {
		return point.completed || point.enabled;
	}
}
