import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver, DecisionPoint, PickType, SubGroup, Choice } from 'phd-common';

@Component({
	selector: 'normal-experience',
	templateUrl: './normal-experience.component.html',
	styleUrls: ['./normal-experience.component.scss'],
	animations: [flipOver]
})
export class NormalExperienceComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() groupName: string;
	@Input() currentSubgroup: SubGroup;
	@Input() errorMessage: string;

	isPointPanelCollapsed: boolean = false;
	points: DecisionPoint[];
	currentPointId: number;
	subGroup: SubGroup;
	
	constructor() { super(); }

	ngOnInit() { }

	ngOnChanges(changes: SimpleChanges) 
	{
		if (changes['currentSubgroup']) 
		{
			this.subGroup = changes['currentSubgroup'].currentValue;
			this.points = this.subGroup.points;
			if (this.points.length) {
				this.currentPointId = this.points[0].id;
			}
		}
	}

	getSubTitle(point: DecisionPoint): string
	{
		if (point)
		{
			switch (point.pointPickTypeId)
			{
				case PickType.Pick1:
					return 'Please select 1 of the choices below';
				case PickType.Pick1ormore:
					return 'Please select 1 or more of the Choices below';
				case PickType.Pick0ormore:
					return 'Please select 0 or more of the choices below';
				case PickType.Pick0or1:
					return 'Please select 0 or 1 of the Choices below';
				default:
					return '';
			}
		}

		return '';
	}

	togglePointPanel() {
		this.isPointPanelCollapsed = !this.isPointPanelCollapsed;
	}

	selectDecisionPoint(pointId: number) {
		const decision = document.getElementById(pointId.toString());

		if (decision) {
			decision.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
		}

		this.currentPointId = pointId;
	}

	choiceToggleHandler(choice: Choice) {
		const point = this.points.find(p => p.choices.some(c => c.id === choice.id));
		if (point) {
			this.currentPointId = point.id;
		}
	}
}
