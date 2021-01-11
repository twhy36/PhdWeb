import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

import { NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';

import { DecisionPoint, Group, SubGroup, Choice, UnsubscribeOnDestroy, flipOver2, isChoiceAttributesComplete } from 'phd-common';

@Component({
	selector: 'decision-point-summary',
	templateUrl: './decision-point-summary.component.html',
	styleUrls: ['./decision-point-summary.component.scss'],
	animations: [
		flipOver2
	],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class DecisionPointSummaryComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() decisionPoint: DecisionPoint;
	@Input() group: Group;
	@Input() subGroup: SubGroup;
	
	selections: Choice[] = [];
	choicesCustom: ChoiceCustom[] = [];

	constructor(private router: Router, private config: NgbDropdownConfig, private cd: ChangeDetectorRef)
	{
		super();

		config.autoClose = false;
	}

	ngOnInit()
	{
		this.setDisplayName();
		this.setPointChoices();
		this.setPointPrice();
	}

	setPointPrice()
	{
		this.decisionPoint.price = this.decisionPoint.choices.reduce((acc, ch) => acc + (ch.quantity * ch.price), 0);
	}

	setDisplayName()
	{
		const selectedChoices = this.decisionPoint.choices.filter(c => c.quantity > 0);

		this.selections = selectedChoices;
	}

	setPointChoices()
	{
		this.choicesCustom = this.decisionPoint.choices.map(c => new ChoiceCustom(c));
	}

	toggleCollapsed(choice: ChoiceCustom): void
	{
		choice.showAttributes = !choice.showAttributes;
	}

	isChoiceComplete(choice: ChoiceCustom): boolean
	{
		return isChoiceAttributesComplete(choice);
	}

	toggleAttributes(toggleAttribute: boolean)
	{
		this.choicesCustom
			.filter(c => c.hasMappedAttributes)
			.forEach(c => c.showAttributes = toggleAttribute);

		this.cd.detectChanges();
	}

	get actionLabel() {
		return this.decisionPoint.isStructuralItem ? 'VIEW' : 'EDIT';
	}
}

class ChoiceCustom extends Choice
{
	showAttributes: boolean;

	get hasMappedAttributes(): boolean
	{
		return (this.mappedAttributeGroups && this.mappedAttributeGroups.length > 0) || (this.mappedLocationGroups && this.mappedLocationGroups.length > 0);
	}

	constructor(c: Choice)
	{
		super(c);

		this.showAttributes = this.hasMappedAttributes;
	}
}
