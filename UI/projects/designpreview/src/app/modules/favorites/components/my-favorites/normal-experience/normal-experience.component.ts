import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

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
export class NormalExperienceComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
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
	@Input() choiceImages: ChoiceImageAssoc[];
	@Input() isReadonly: boolean;
	@Input() isPreview: boolean = false;
	@Input() isDesignComplete: boolean = false;

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

			this.subGroup = changes['currentSubgroup'].currentValue;
			this.points = this.subGroup ? this.subGroup.points : null;
		}

		if (changes['decisionPointId'])
		{
			const pointId = changes['decisionPointId'].currentValue;
			if (pointId && pointId !== this.currentPointId)
			{
				this.selectDecisionPoint(pointId, 1600);
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

	togglePointPanel() {
		this.isPointPanelCollapsed = !this.isPointPanelCollapsed;
	}

	selectDecisionPoint(pointId: number, interval?: number) {
		if (pointId)
		{
			setTimeout(() =>
			{
				const firstPointId = this.points && this.points.length ? this.points[0].id : 0;
				this.scrollPointIntoView(pointId, pointId === firstPointId);
			}, interval || 500);
		}
		this.currentPointId = pointId;
		this.onSelectDecisionPoint.emit(pointId);
	}

	declineDecisionPoint(point: DecisionPoint) {
		this.onDeclineDecisionPoint.emit(point);
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
		if (point.isPastCutOff || this.salesChoices?.findIndex(c => c.divChoiceCatalogId === choice.divChoiceCatalogId) > -1)
		{
			choiceStatus = 'Contracted';
		}
		else
		{
			const contractedChoices = point.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
			if (contractedChoices && contractedChoices.length &&
				(point.pointPickTypeId === PickType.Pick1 || point.pointPickTypeId === PickType.Pick0or1))
			{
				choiceStatus = 'ViewOnly';
			}
		}

		const myFavoritesChoice = this.myFavoritesChoices ? this.myFavoritesChoices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId) : null;
		const images = this.choiceImages?.filter(x => x.dpChoiceId === choice.id);

		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem, images);
	}

	showDeclineCard(point: DecisionPoint): boolean {
		return (point.pointPickTypeId === 2 || point.pointPickTypeId === 4)
			&& !point.isStructuralItem
			&& !point.isPastCutOff
			&& point.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1)?.length === 0;
	}

	scrollPointIntoView(pointId: number, isFirstPoint: boolean)
	{
		const decision = document.getElementById(pointId?.toString());
		if (decision)
		{
			if (isFirstPoint)
			{
				decision.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
			}
			else
			{
				// Workaround to display the element moved under the nav bar
				const pos = decision.style.position;
				const top = decision.style.top;
				decision.style.position = 'relative';
				decision.style.top = '-200px';
				decision.scrollIntoView({behavior: 'smooth', block: 'start'});
				decision.style.top = top;
				decision.style.position = pos;
			}
		}
	}

	viewChoiceDetail(choice: ChoiceExt)
	{
		const pointId = this.points?.length ? this.points.find(p => p.choices.find(c => c.id === choice.id))?.id || this.points[0].id : 0;
		this.selectDecisionPoint(pointId);
		this.onViewChoiceDetail.emit(choice);
	}

	displayDecisionPoint(point: DecisionPoint) {
		if (point.isHiddenFromBuyerView) {
			return false;
		} else {
			const choices = _.flatMap(point.choices);
			let aChoiceExists = false;
			choices.forEach(c => {
				if (!c.isHiddenFromBuyerView) {
					aChoiceExists = true;
				}
			})
			return aChoiceExists;
		}
	}

	get isContractedOptionsDisabled() : boolean
	{
		return this.isPreview || this.isDesignComplete;
	}
}
