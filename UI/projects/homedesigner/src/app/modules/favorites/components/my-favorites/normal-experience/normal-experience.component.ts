import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver, DecisionPoint, PickType, SubGroup, Choice, JobChoice } from 'phd-common';

import { MyFavoritesChoice } from '../../../../shared/models/my-favorite.model';
import { ChoiceExt } from '../../../../shared/models/choice-ext.model';

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
	@Input() decisionPointId: number;
	@Input() includeContractedOptions: boolean = true;
	@Input() salesChoices: JobChoice[];

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onToggleContractedOptions = new EventEmitter();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();

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
				// Prevent from reloading the page
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
			}
		}

		if (changes['decisionPointId']) 
		{
			this.selectDecisionPoint(changes['decisionPointId'].currentValue);
		}
	}

	getSubTitle(point: DecisionPoint): string
	{
		if (point)
		{
			const contractedChoices = point.choices.filter(c => this.salesChoices.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
			const isPreviouslyContracted = contractedChoices && contractedChoices.length;
			
			switch (point.pointPickTypeId)
			{
				case PickType.Pick1:
					return isPreviouslyContracted
							? 'Previously Contracted Option'
							: 'Please select 1 of the choices below';
				case PickType.Pick1ormore:
					return isPreviouslyContracted
							? 'Previously Contracted Options'
							: 'Please select 1 or more of the Choices below';
				case PickType.Pick0ormore:
					return isPreviouslyContracted
							? 'Previously Contracted Options'
							: 'Please select 0 or more of the choices below';
				case PickType.Pick0or1:
					return isPreviouslyContracted
							? 'Previously Contracted Option'
							: 'Please select 0 or 1 of the Choices below';
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
		if (pointId !== this.currentPointId)
		{
			if (pointId)
			{
				setTimeout(() =>
				{
					const decision = document.getElementById(pointId.toString());
					if (decision)
					{
						decision.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
					}
				}, 250);
			}
			this.currentPointId = pointId;			
		}
	}

	choiceToggleHandler(choice: ChoiceExt) {
		const point = this.points.find(p => p.choices.some(c => c.id === choice.id));
		if (point && this.currentPointId != point.id) {
			this.currentPointId = point.id;
		}

		this.choiceToggled = true;
		this.onToggleChoice.emit(choice);
	}

	toggleContractedOptions(event: any) {
		this.onToggleContractedOptions.emit();
	}

	getChoiceExt(choice: Choice, point: DecisionPoint) : ChoiceExt 
	{
		let choiceStatus = 'Available';
		if (this.salesChoices.findIndex(c => c.divChoiceCatalogId === choice.divChoiceCatalogId) > -1)
		{
			choiceStatus = 'Contracted';
		}
		else
		{
			const contractedChoices = point.choices.filter(c => this.salesChoices.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
			if (contractedChoices && contractedChoices.length && 
				(point.pointPickTypeId === PickType.Pick1 || point.pointPickTypeId === PickType.Pick0or1))
			{
				choiceStatus = 'ViewOnly';
			}			
		}

		const isFavorite = this.myFavoritesChoices 
			? this.myFavoritesChoices.findIndex(x => x.divChoiceCatalogId === choice.divChoiceCatalogId) > -1
			: false;		

		return new ChoiceExt(choice, choiceStatus, isFavorite);
	}

	viewChoiceDetail(choice: ChoiceExt)
	{
		this.onViewChoiceDetail.emit(choice);
	}
}
