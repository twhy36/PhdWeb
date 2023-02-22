import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

import * as _ from 'lodash';

import
{
	UnsubscribeOnDestroy, DecisionPoint, SubGroup, JobChoice, ChoiceImageAssoc, Group,
	Tree, MyFavoritesChoice, MyFavoritesPointDeclined
} from 'phd-common';
import { BrandService } from '../../../../core/services/brand.service';

import { ChoiceExt } from '../../../../shared/models/choice-ext.model';

@Component({
	selector: 'floor-plan-experience',
	templateUrl: './floor-plan-experience.component.html',
	styleUrls: ['./floor-plan-experience.component.scss']
})
export class FloorPlanExperienceComponent extends UnsubscribeOnDestroy implements OnChanges
{
	@Input() groupName: string;
	@Input() currentSubgroup: SubGroup;
	@Input() errorMessage: string;
	@Input() myFavoritesChoices: MyFavoritesChoice[];
	@Input() decisionPointId: number;
	@Input() includeContractedOptions: boolean = false;
	@Input() salesChoices: JobChoice[];
	@Input() marketingPlanId: number;
	@Input() isFloorplanFlipped: boolean;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];
	@Input() isReadonly: boolean;
	@Input() isPreview: boolean = false;
	@Input() isPresale: boolean = false;
	@Input() isDesignComplete: boolean = false;
	@Input() noVisibleGroups: boolean = false;
	@Input() noVisibleFP: boolean = false;
	@Input() unfilteredPoints: DecisionPoint[] = [];

	@Output() toggleChoice = new EventEmitter<ChoiceExt>();
	@Output() toggleContractedOptions = new EventEmitter();
	@Output() viewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() selectDecisionPoint = new EventEmitter<number>();
	@Output() declineDecisionPoint = new EventEmitter<DecisionPoint>();

	isPointPanelCollapsed: boolean = false;
	points: DecisionPoint[];
	currentPointId: number;
	subGroup: SubGroup;
	choiceToggled: boolean = false;
	floors;
	fpOptions;
	selectedFloor;

	constructor(private brandService: BrandService)
	{
		super();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['currentSubgroup'])
		{
			const newSubGroup = (changes['currentSubgroup'].currentValue) as SubGroup;
			if (this.choiceToggled)
			{
				// Prevent from reloading the page
				const newChoices = _.flatMap(newSubGroup.points, pt => pt.choices);
				const choices = _.flatMap(this.subGroup.points, pt => pt.choices);
				newChoices.forEach(nc =>
				{
					const choice = choices.find(x => x.divChoiceCatalogId === nc.divChoiceCatalogId);
					if (choice)
					{
						choice.quantity = nc.quantity;
					}
				});
				this.choiceToggled = false;
			}
			this.subGroup = changes['currentSubgroup'].currentValue;
			this.points = this.subGroup ? this.subGroup.points : null;
		}

		if (changes['decisionPointId'])
		{
			this.selectDecisionPointHandler(changes['decisionPointId'].currentValue);
		}
	}

	togglePointPanel()
	{
		this.isPointPanelCollapsed = !this.isPointPanelCollapsed;
	}

	selectDecisionPointHandler(pointId: number)
	{
		if (pointId)
		{
			setTimeout(() =>
			{
				this.scrollPointIntoView(pointId);
			}, 500);

			this.selectDecisionPoint.emit(pointId);
		}

		this.currentPointId = pointId;
	}

	choiceToggleHandler(choice: ChoiceExt)
	{
		const point = this.points.find(p => p.choices.some(c => c.id === choice.id));
		if (point && this.currentPointId != point.id)
		{
			this.currentPointId = point.id;
		}

		// For subgroups using the floorplan, a favorite selection can cause an update to the floorplan image
		if (this.subGroup?.useInteractiveFloorplan && choice.options.length)
		{
			const integrationKey = choice.options[0].financialOptionIntegrationKey;
			const fpOption = this.fpOptions?.find(x => x.id.includes(integrationKey));

			if (fpOption)
			{
				const floor = this.floors.find(f => f.id === fpOption.floor);
				this.selectedFloor = floor;
			}
		}

		this.choiceToggled = true;
		this.toggleChoice.emit(choice);
	}

	viewChoiceDetailHandler(choice: ChoiceExt) 
	{
		setTimeout(() => 
		{
			this.viewChoiceDetail.emit(choice);
		}, 50);
	}

	loadFloorPlan(fp) 
	{
		// load floors
		this.floors = fp.floors;
		if (!this.selectedFloor) 
		{
			const floor1 = this.floors.find(floor => floor.name === 'Floor 1');
			if (floor1) 
			{
				this.selectedFloor = floor1;
			}
			else 
			{
				this.selectedFloor = this.floors[0];
			}
		}
		//load options
		this.fpOptions = fp.options;
	}

	selectFloor(floor) 
	{
		this.selectedFloor = floor;
	}

	declineDecisionPointHandler(point: DecisionPoint)
	{
		this.declineDecisionPoint.emit(point);
	}

	scrollPointIntoView(pointId: number)
	{
		const decisionBarElement = <HTMLElement>document.getElementById('decision-bar-' + pointId?.toString());
		if (decisionBarElement)
		{
			decisionBarElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
		}
	}

	getDefaultFPImageSrc()
	{
		return this.brandService.getBrandImage('logo');
	}
}
