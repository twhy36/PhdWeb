import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, DecisionPoint, SubGroup, JobChoice, ChoiceImageAssoc } from 'phd-common';

import { MyFavoritesChoice, MyFavoritesPointDeclined } from '../../../../shared/models/my-favorite.model';
import { ChoiceExt } from '../../../../shared/models/choice-ext.model';

@Component({
  selector: 'floor-plan-experience',
  templateUrl: './floor-plan-experience.component.html',
  styleUrls: ['./floor-plan-experience.component.scss']
})
export class FloorPlanExperienceComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() groupName: string;
	@Input() currentSubgroup: SubGroup;
	@Input() errorMessage: string;
	@Input() myFavoritesChoices: MyFavoritesChoice[];
	@Input() decisionPointId: number;
	@Input() includeContractedOptions: boolean = true;
	@Input() salesChoices: JobChoice[];
	@Input() marketingPlanId: number;
	@Input() isFloorplanFlipped: boolean;
	@Input() choiceImages: ChoiceImageAssoc[];
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onToggleContractedOptions = new EventEmitter();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();
	@Output() onDeclineDecisionPoint = new EventEmitter<DecisionPoint>();

	isPointPanelCollapsed: boolean = false;
	points: DecisionPoint[];
	currentPointId: number;
	subGroup: SubGroup;
	choiceToggled: boolean = false;
	floors: any[];
	fpOptions: any[];
	selectedFloor: any;

	constructor() {
		super();
	}

	ngOnInit() {
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['currentSubgroup']) {
			const newSubGroup = (changes['currentSubgroup'].currentValue) as SubGroup;
			if (this.choiceToggled) {
				// Prevent from reloading the page
				const newChoices = _.flatMap(newSubGroup.points, pt => pt.choices);
				let choices = _.flatMap(this.subGroup.points, pt => pt.choices);
				newChoices.forEach(nc => {
					let choice = choices.find(x => x.divChoiceCatalogId === nc.divChoiceCatalogId);
					if (choice) {
						choice.quantity = nc.quantity;
					}
				});
				this.choiceToggled = false;
			} else {
				this.subGroup = changes['currentSubgroup'].currentValue;
				this.points = this.subGroup ? this.subGroup.points : null;
			}
		}

		if (changes['decisionPointId']) {
			this.selectDecisionPoint(changes['decisionPointId'].currentValue);
		}
	}

	togglePointPanel() {
		this.isPointPanelCollapsed = !this.isPointPanelCollapsed;
	}

	selectDecisionPoint(pointId: number) {
		if (pointId !== this.currentPointId) {
			this.currentPointId = pointId;
			this.onSelectDecisionPoint.emit(pointId);
		}
	}

	choiceToggleHandler(choice: ChoiceExt) {
		const point = this.points.find(p => p.choices.some(c => c.id === choice.id));
		if (point && this.currentPointId != point.id) {
			this.currentPointId = point.id;
		}

		// For subgroups using the floorplan, a favorite selection can cause an update to the floorplan image
		if (this.subGroup?.useInteractiveFloorplan && choice.options.length) {
			const integrationKey = choice.options[0].financialOptionIntegrationKey;
			const fpOption = this.fpOptions.find(x => x.id.includes(integrationKey));

			if (fpOption) {
				const floor = this.floors.find(f => f.id === fpOption.floor);
				this.selectedFloor = floor;
			}
		}

		this.choiceToggled = true;
		this.onToggleChoice.emit(choice);
	}

	toggleContractedOptions(event: any) {
		this.onToggleContractedOptions.emit();
	}

	viewChoiceDetail(choice: ChoiceExt) {
		setTimeout(() => {
			this.onViewChoiceDetail.emit(choice);
		}, 50);
	}

	loadFloorPlan(fp) {
		// load floors
		this.floors = fp.floors;
		if (!this.selectedFloor) {
			const floor1 = this.floors.find(floor => floor.name === 'Floor 1');
			if (floor1) {
				this.selectedFloor = floor1;
			} else {
				this.selectedFloor = this.floors[0];
			}
		}
		//load options
		this.fpOptions = fp.options;
	}

	selectFloor(floor: any) {
		this.selectedFloor = floor;
	}

	declineDecisionPoint(point: DecisionPoint) {
		this.onDeclineDecisionPoint.emit(point);
	}
}

