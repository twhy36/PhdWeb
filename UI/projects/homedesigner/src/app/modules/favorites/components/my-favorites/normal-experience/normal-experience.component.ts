import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver, DecisionPoint, PickType, SubGroup, Choice } from 'phd-common';

import { MyFavoritesChoice } from '../../../../shared/models/my-favorite.model';

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
	@Input() myFavoritesChoices: MyFavoritesChoice[];

	@Output() onToggleChoice = new EventEmitter<Choice>();

	isPointPanelCollapsed: boolean = false;
	points: DecisionPoint[];
	currentPointId: number;
	subGroup: SubGroup;
	choiceToggled: boolean = false;

	constructor() { super(); }

	ngOnInit() { }

	ngOnChanges(changes: SimpleChanges) 
	{
		if (changes['currentSubgroup']) 
		{
			const newSubGroup = (changes['currentSubgroup'].currentValue) as SubGroup;
			if (this.choiceToggled)
			{
				// Prevent reloading the page
				const newChoices = _.flatMap(newSubGroup.points, pt => pt.choices);
				let choices = _.flatMap(this.subGroup.points, pt => pt.choices);
				newChoices.forEach(nc => {
					let choice = choices.find(x => x.divChoiceCatalogId === nc.divChoiceCatalogId);
					if (choice)
					{
						choice.quantity = nc.quantity;
					}
				});
				this.choiceToggled = false;
			}
			else
			{
				this.subGroup = changes['currentSubgroup'].currentValue;
				this.points = this.subGroup ? this.subGroup.points : null;
				if (this.points && this.points.length) {
					this.currentPointId = this.points[0].id;
				}				
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
		if (point && this.currentPointId != point.id) {
			this.currentPointId = point.id;
		}

		this.choiceToggled = true;
		this.onToggleChoice.emit(choice);
	}
}
