import { Component, OnInit, OnChanges, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef, SimpleChanges, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

import { NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';

import { DecisionPoint, Group, SubGroup, Choice, JobChoice, UnsubscribeOnDestroy, flipOver2, DesignToolAttribute } from 'phd-common';
import { isChoiceAttributesComplete } from '../../classes/utils.class';
import { BuildMode } from '../../models/build-mode.model';

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
	@Input() buildMode: BuildMode;
	@Input() isDesignComplete: boolean = false;
	@Input() isPresale: boolean = false;
	@Input() contractedOptionsPage: boolean = false;
	@Input() favoritesId: number;
	@Input() isPresalePricingEnabled: boolean = false;

	@Output() viewFavorites = new EventEmitter<DecisionPoint>();
	@Output() removeFavorites = new EventEmitter<Choice>();

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
		this.isReadonly = this.buildMode === BuildMode.BuyerPreview || !favoriteChoices || favoriteChoices.length < 1;
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

	get actionLabel()
	{
		return this.isReadonly ? 'View' : 'Edit';
	}

	onViewOrEdit()
	{
		this.viewFavorites.emit(this.decisionPoint);
	}

	onRemove(choice: Choice)
	{
		this.removeFavorites.emit(choice);
	}

	getAttributeLabel(name: string)
	{
		if (name)
		{
			if (name.charAt(name.length - 1) === ':')
			{
				return name;
			}
			else
			{
				return name + ':';
			}
		}
	}

	getAttributeList(names: string[])
	{
		return names.join(', ');
	}

	consolidateAttributes(attributes: DesignToolAttribute[])
	{
		const attributeGroupLabels: string[] = [];

		attributes.forEach(a => 
		{
			if (!attributeGroupLabels.find(label => a.attributeGroupLabel === label))
			{
				attributeGroupLabels.push(a.attributeGroupLabel);
			}
		})

		const consolidatedAttributeGroups = [];

		attributeGroupLabels.forEach(label =>
		{
			consolidatedAttributeGroups.push(new ConsolidatedAttributeGroup(attributes, label));
		})

		return consolidatedAttributeGroups;
	}

	onAdditionalSelections(choice: ChoiceCustom)
	{
		if (!this.contractedOptionsPage && !this.isDesignComplete)
		{
			this.router.navigate(['favorites', 'my-favorites', this.favoritesId, this.subGroup.subGroupCatalogId, choice.divChoiceCatalogId], { queryParamsHandling: 'merge' });
		}
	}

}

class ConsolidatedAttributeGroup
{
	attributeGroupLabel: string;
	attributeGroupNames: string[] = [];

	constructor(attributes: DesignToolAttribute[], label: string)
	{
		this.attributeGroupLabel = label;

		attributes.forEach(a =>
		{
			if (a.attributeGroupLabel === label)
			{
				this.attributeGroupNames.push(a.attributeName);
			}
		})
	}
}

class ChoiceCustom extends Choice
{
	showAttributes: boolean;
	mappedSelectedAttributes = [];

	get hasMappedAttributes(): boolean
	{
		return (this.mappedAttributeGroups && this.mappedAttributeGroups.length > 0) || (this.mappedLocationGroups && this.mappedLocationGroups.length > 0);
	}

	constructor(c: Choice)
	{
		super(c);

		this.showAttributes = this.hasMappedAttributes;
		this.mappedSelectedAttributes = this.selectedAttributes.filter(attr => attr.attributeId === null).map(attr => ({ ...attr, attributes: [] }));

		this.selectedAttributes.filter(attr => attr.attributeId !== null).forEach(selectedAttribute =>
		{
			const mappedSelectedAttribute = this.mappedSelectedAttributes.find(mappedAttr => mappedAttr.locationId === selectedAttribute.locationId);

			if (mappedSelectedAttribute)
			{
				mappedSelectedAttribute.attributes.push(selectedAttribute);
			}
			else
			{
				this.mappedSelectedAttributes.push({ ...selectedAttribute, attributes: [selectedAttribute] })
			}
		});
	}
}

