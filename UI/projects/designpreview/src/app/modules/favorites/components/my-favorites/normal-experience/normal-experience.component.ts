import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

import * as _ from 'lodash';

import
{
	UnsubscribeOnDestroy, flipOver, DecisionPoint, PickType, SubGroup, Choice, JobChoice, Group, ChoiceImageAssoc,
	Tree, MyFavoritesChoice, MyFavoritesPointDeclined
} from 'phd-common';

import { ChoiceExt } from '../../../../shared/models/choice-ext.model';

@Component({
	selector: 'normal-experience',
	templateUrl: './normal-experience.component.html',
	styleUrls: ['./normal-experience.component.scss'],
	animations: [flipOver]
})
export class NormalExperienceComponent extends UnsubscribeOnDestroy implements OnChanges
{
	@Input() groupName: string;
	@Input() currentSubgroup: SubGroup;
	@Input() errorMessage: string;
	@Input() myFavoritesChoices: MyFavoritesChoice[];
	@Input() myFavoritesPointsDeclined: MyFavoritesPointDeclined[];
	@Input() decisionPointId: number;
	@Input() includeContractedOptions: boolean = false;
	@Input() salesChoices: JobChoice[];
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean = false;
	@Input() noVisibleGroups: boolean = false;
	@Input() unfilteredPoints: DecisionPoint[] = [];

	@Output() toggleChoice = new EventEmitter<ChoiceExt>();
	@Output() viewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() selectDecisionPoint = new EventEmitter<number>();
	@Output() declineDecisionPoint = new EventEmitter<DecisionPoint>();

	isPointPanelCollapsed: boolean = false;
	points: DecisionPoint[];
	currentPointId: number;
	subGroup: SubGroup;
	choiceToggled: boolean = false;

	constructor() { super(); }

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

		if (changes['decisionPointId'] || changes['myFavoritesChoices'] || changes['myFavoritesPointsDeclined'])
		{
			const pointId = changes['decisionPointId']?.currentValue;
			if (pointId && pointId !== this.currentPointId
				|| this.isInputChanged(changes['myFavoritesChoices'])
				|| this.isInputChanged(changes['myFavoritesPointsDeclined']))
			{
				this.selectDecisionPointHandler(pointId || this.currentPointId, 1600);
			}
		}
	}

	getSubTitle(point: DecisionPoint): string
	{
		if (point)
		{
			const contractedChoices = point.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
			const isPreviouslyContracted = contractedChoices && contractedChoices.length;

			switch (point.pointPickTypeId)
			{
			case PickType.Pick1:
				return isPreviouslyContracted
					? 'Previously Contracted Option'
					: 'Please select one of the choices below';
			case PickType.Pick1ormore:
				return isPreviouslyContracted
					? 'Previously Contracted Options'
					: 'Please select at least one of the Choices below';
			case PickType.Pick0ormore:
				return isPreviouslyContracted
					? 'Previously Contracted Options'
					: 'Please select at least one of the Choices below';
			case PickType.Pick0or1:
				return isPreviouslyContracted
					? 'Previously Contracted Option'
					: 'Please select one of the choices below';
			default:
				return '';
			}
		}

		return '';
	}

	togglePointPanel()
	{
		this.isPointPanelCollapsed = !this.isPointPanelCollapsed;
	}

	selectDecisionPointHandler(pointId: number, interval?: number) 
	{
		if (pointId && !this.currentSubgroup.useInteractiveFloorplan)
		{
			setTimeout(() =>
			{
				const firstPointId = this.points && this.points.length ? this.points[0].id : 0;
				this.scrollPointIntoView(pointId, pointId === firstPointId);
			}, interval || 500);

			this.selectDecisionPoint.emit(pointId);
		}

		this.currentPointId = pointId;
	}

	declineDecisionPointHandler(point: DecisionPoint) 
	{
		this.currentPointId = point.id;
		this.declineDecisionPoint.emit(point);
	}

	choiceToggleHandler(choice: ChoiceExt)
	{
		const point = this.points.find(p => p.choices.some(c => c.id === choice.id));
		if (point && this.currentPointId != point.id)
		{
			this.currentPointId = point.id;
		}
		this.choiceToggled = true;
		this.toggleChoice.emit(choice);
	}

	getChoiceExt(choice: Choice, point: DecisionPoint): ChoiceExt
	{
		const unfilteredPoint = this.unfilteredPoints.find(up => up.divPointCatalogId === point.divPointCatalogId);
		let choiceStatus = 'Available';
		if (point.isPastCutOff || this.salesChoices?.findIndex(c => c.divChoiceCatalogId === choice.divChoiceCatalogId) > -1)
		{
			choiceStatus = 'Contracted';
		}
		else
		{
			const contractedChoices = unfilteredPoint.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
			if (contractedChoices && contractedChoices.length &&
				(point.pointPickTypeId === PickType.Pick1 || point.pointPickTypeId === PickType.Pick0or1))
			{
				choiceStatus = 'ViewOnly';
			}
		}

		const myFavoritesChoice = this.myFavoritesChoices ? this.myFavoritesChoices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId) : null;

		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem);
	}

	showDeclineCard(point: DecisionPoint): boolean 
	{
		const unfilteredPoint = this.unfilteredPoints.find(up => up.divPointCatalogId === point.divPointCatalogId);
		return (unfilteredPoint.pointPickTypeId === 2 || unfilteredPoint.pointPickTypeId === 4)
			&& (this.isPresale || !unfilteredPoint.isStructuralItem)
			&& !unfilteredPoint.isPastCutOff
			&& unfilteredPoint.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1)?.length === 0;
	}

	scrollPointIntoView(pointId: number, isFirstPoint: boolean)
	{
		const pointCardElement = <HTMLElement>document.getElementById(`point-card-${pointId?.toString()}`);

		if (pointCardElement && !this.subGroup.useInteractiveFloorplan)
		{
			if (isFirstPoint)
			{
				setTimeout(() =>
				{
					pointCardElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
				}, 250);
			}
			else
			{
				// Workaround to display the element moved under the nav bar
				setTimeout(() =>
				{
					const pos = pointCardElement.style.position;
					const top = pointCardElement.style.top;
					pointCardElement.style.position = 'relative';
					pointCardElement.style.top = '-200px';
					pointCardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
					pointCardElement.style.top = top;
					pointCardElement.style.position = pos;
				}, 250);
			}
		}

		const decisionBarElement = <HTMLElement>document.getElementById('decision-bar-' + pointId?.toString());

		if (decisionBarElement && !this.subGroup.useInteractiveFloorplan)
		{
			setTimeout(() => 
			{
				decisionBarElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
			}, 1000);
		}
	}

	viewChoiceDetailHandler(choice: ChoiceExt)
	{
		const pointId = this.points?.length ? this.points.find(p => p.choices.find(c => c.id === choice.id))?.id || this.points[0].id : 0;
		this.selectDecisionPointHandler(pointId);
		this.viewChoiceDetail.emit(choice);
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
				if (!c.isHiddenFromBuyerView)
				{
					aChoiceExists = true;
				}
			})
			return aChoiceExists;
		}
	}

	isInputChanged(input) : boolean
	{
		let isValueChanged = false;

		if (input)
		{
			const currentDiff = _.differenceBy(input.currentValue, input.previousValue, 'id');
			const prevDiff = _.differenceBy(input.previousValue, input.currentValue, 'id');
			isValueChanged = input.currentValue?.length !== input.previousValue?.length
				|| !!currentDiff?.length
				|| !!prevDiff?.length;
		}

		return isValueChanged;
	}
}
