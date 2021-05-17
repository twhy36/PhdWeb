import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver, DecisionPoint, PickType, Group, SubGroup, Choice, JobChoice, DesignToolAttribute } from 'phd-common';

import { MyFavoritesChoice, MyFavoritesPointDeclined } from '../../../../shared/models/my-favorite.model';
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
	@Input() includeContractedOptions: boolean = true;
	@Input() salesChoices: JobChoice[];
	@Input() groups: Group[];

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onToggleContractedOptions = new EventEmitter();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();
	@Output() onDeclineDecisionPoint = new EventEmitter<MyFavoritesPointDeclined>();

	isPointPanelCollapsed: boolean = false;
	points: DecisionPoint[];
	filteredChoiceIds: number[] = [];
	filteredPointIds: number[] = [];
	currentPointId: number;
	subGroup: SubGroup;
	choiceToggled: boolean = false;

	constructor() { super(); }

	ngOnInit() { 
		console.log(this.points);
		this.groups.forEach(g => g.subGroups.forEach(sg => sg.points.forEach(p => {
			this.filteredPointIds.push(p.id);
			p.choices.forEach(c => {
				this.filteredChoiceIds.push(c.id);
			})
		})))
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

	rulesFilteredPoints(points: DecisionPoint[]) {
		let decisionBarPoints = [];
		points.forEach(p => {
			let hidePoint = false;
			if (p.hasPointToPointRules && !hidePoint) {
				p.disabledBy.forEach(db => {
					db.rules.forEach(r => {
						r.points.forEach(dp => {
							if (this.filteredPointIds.indexOf(dp) < 0) {
								hidePoint = true;
							}
						})
					})
				})
			} 
			if (p.hasPointToChoiceRules && !hidePoint) {
				p.disabledBy.forEach(db => {
					db.rules.forEach(r => {
						r.choices.forEach(dc => {
							if (this.filteredChoiceIds.indexOf(dc) < 0) {
								hidePoint = true;
							}
						})
					})
				})
			}
			// choice to choice if dp length is only 1
			if (p.choices.length === 1 && !hidePoint) {
				p.choices.forEach(c => {
					if (c.disabledBy.length > 0) {
						c.disabledBy.forEach(db => {
							db.rules.forEach(r => {
							if (r.ruleType === 1) {
								r.choices.forEach(dc => {
									//Not found in the filtered choices
									if (this.filteredChoiceIds.indexOf(dc) < 0) {
										hidePoint = true;
									}	
								})
							}})
						})
					}
				})
			} 
			if (!hidePoint) {
				decisionBarPoints.push(p);
			}
		})
		return decisionBarPoints;
	}

	checkChoiceToChoiceRuleStatus(choice: ChoiceExt) {
		let matchFound = true;
		choice.disabledBy.forEach(db => {
			db.rules.forEach(r => {
				if (r.ruleType === 1) {
					r.choices.forEach(dc => {
						//Not found in the filtered choices
						if (this.filteredChoiceIds.indexOf(dc) < 0) {
							matchFound = false;
						}	
					})
				}
			})
		})
		return matchFound;
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

	selectDecisionPoint(pointId: number) {
		if (pointId !== this.currentPointId)
		{
			if (pointId)
			{
				setTimeout(() =>
				{
					const firstPointId = this.points && this.points.length ? this.points[0].id : 0;
					this.scrollPointIntoView(pointId, pointId === firstPointId);
				}, 250);
			}
			this.currentPointId = pointId;
			this.onSelectDecisionPoint.emit(pointId);
		}
	}

	declineDecisionPoint(declinedPoint: MyFavoritesPointDeclined) {
		this.onDeclineDecisionPoint.emit(declinedPoint);
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

		const myFavoritesChoice = this.myFavoritesChoices ? this.myFavoritesChoices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId) : null;
		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem);
	}

	scrollPointIntoView(pointId: number, isFirstPoint: boolean)
	{
		const decision = document.getElementById(pointId.toString());
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
				decision.style.top = '-150px';
				decision.scrollIntoView({behavior: 'smooth', block: 'start'});
				decision.style.top = top;
				decision.style.position = pos;
			}
		}
	}

	viewChoiceDetail(choice: ChoiceExt)
	{
		setTimeout(() =>
		{
			const pointId = this.points && this.points.length ? this.points[0].id : 0;
			this.scrollPointIntoView(pointId, true);
			this.onViewChoiceDetail.emit(choice);
		}, 50);
	}
}
