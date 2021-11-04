import { Component, OnInit, OnChanges, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef, SimpleChanges, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

import { NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';

import { DecisionPoint, Group, SubGroup, Choice, JobChoice, UnsubscribeOnDestroy, flipOver2, isChoiceAttributesComplete } from 'phd-common';

@Component({
	selector: 'decision-point-summary',
	templateUrl: './decision-point-summary.component.html',
	styleUrls: ['./decision-point-summary.component.scss'],
	animations: [
		flipOver2
	],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class DecisionPointSummaryComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() decisionPoint: DecisionPoint;
	@Input() group: Group;
	@Input() subGroup: SubGroup;
	@Input() salesChoices: JobChoice[];
	@Input() includeContractedOptions: boolean;
	@Input() buildMode: string;
	@Input() isDesignComplete: boolean = false;
	@Input() contractedOptionsPage: boolean = false;

	@Output() onViewFavorites = new EventEmitter<DecisionPoint>();
	@Output() onRemoveFavorites = new EventEmitter<Choice>();

	selections: Choice[] = [];
	choicesCustom: ChoiceCustom[] = [];
	isReadonly: boolean = false;

	constructor(private router: Router, private config: NgbDropdownConfig, private cd: ChangeDetectorRef)
	{
		super();

		config.autoClose = false;
	}

	ngOnInit()
	{
		this.setDisplayName();
		this.setPointChoices();

		const choices = this.decisionPoint.choices.filter(c => c.quantity > 0) || [];
		const favoriteChoices = choices.filter(c => !this.salesChoices || this.salesChoices.findIndex(sc => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);
		this.isReadonly = this.buildMode === 'buyerPreview' || !favoriteChoices || favoriteChoices.length < 1;
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['includeContractedOptions'])
		{
			this.includeContractedOptions = changes['includeContractedOptions'].currentValue;
			this.setPointChoices();
		}
	}

	setDisplayName()
	{
		const selectedChoices = this.decisionPoint.choices.filter(c => c.quantity > 0);

		this.selections = selectedChoices;
	}

	setPointChoices()
	{
		const choices = this.includeContractedOptions || this.contractedOptionsPage
							? this.decisionPoint.choices
							: this.decisionPoint.choices.filter(c => !this.salesChoices || this.salesChoices.findIndex(sc => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);
		this.choicesCustom = choices.map(c => new ChoiceCustom(c));
	}

	toggleCollapsed(choice: ChoiceCustom): void
	{
		choice.showAttributes = !choice.showAttributes;
		this.cd.detectChanges();
	}

	isChoiceComplete(choice: ChoiceCustom): boolean
	{
		return isChoiceAttributesComplete(choice) || this.isDesignComplete;
	}

	toggleAttributes(toggleAttribute: boolean)
	{
		this.choicesCustom
			.filter(c => c.hasMappedAttributes)
			.forEach(c => c.showAttributes = toggleAttribute);

		this.cd.detectChanges();
	}

	get actionLabel() {
		return this.isReadonly ? 'VIEW' : 'EDIT';
	}

	onViewOrEdit()
	{
		this.onViewFavorites.emit(this.decisionPoint);
	}

	onRemove(choice: Choice)
	{
		this.onRemoveFavorites.emit(choice);
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
