import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

import { NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';
import * as _ from 'lodash';

import {
	UnsubscribeOnDestroy, flipOver2, isChoiceAttributesComplete, DesignToolAttribute, PointStatus, DecisionPoint,
	Group, SubGroup, Choice, ChoiceImageAssoc, TreeService
} from 'phd-common';
import { environment } from '../../../../../environments/environment';


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
	@Input() scenarioId: number;
	@Input() filtered: boolean;
	@Input() showImages: boolean;
	@Input() choiceImages: ChoiceImageAssoc[];
	@Input() canEditAgreement: boolean;

	public PointStatus = PointStatus;

	selections: Choice[] = [];
	choicesCustom: ChoiceCustom[] = [];

	constructor(private router: Router, private config: NgbDropdownConfig, private cd: ChangeDetectorRef, private _treeService: TreeService)
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

	editClick(divPointCatalogId: number)
	{
		this.router.navigate(['/edit-home', this.scenarioId || 0, divPointCatalogId]);
	}

	setPointChoices()
	{
		this.choicesCustom = this.decisionPoint.choices.map(choice =>
		{
			const choiceImages = this.choiceImages.filter(c => c.dpChoiceId === choice.id);
			let newChoice = _.cloneDeep(choice);

			newChoice.choiceImages = choiceImages.length ? choiceImages.sort((a, b) => a.sortKey < b.sortKey ? -1 : 1) : [];

			return new ChoiceCustom(newChoice);
		});
	}

	toggleCollapsed(choice: ChoiceCustom): void
	{
		choice.showAttributes = !choice.showAttributes;
	}

	getImagePath(attr: DesignToolAttribute): string
	{
		let imageUrl = environment.defaultImageURL;

		if (attr.attributeImageUrl)
		{
			imageUrl = attr.attributeImageUrl;
		}

		return imageUrl;
	}

	isChoiceComplete(choice: ChoiceCustom): boolean
	{
		return isChoiceAttributesComplete(choice);
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		event.srcElement.src = environment.defaultImageURL;
	}

	toggleAttributes(toggleAttribute: boolean)
	{
		this.choicesCustom
			.filter(c => c.hasMappedAttributes)
			.forEach(c => c.showAttributes = toggleAttribute);

		this.cd.detectChanges();
	}

	toggleImages(toggleImages: boolean)
	{
		this.showImages = toggleImages;

		this.cd.detectChanges();
	}
}

class ChoiceCustom extends Choice
{
	showAttributes: boolean;
	choiceImagePath: string;

	get hasMappedAttributes(): boolean
	{
		return (this.mappedAttributeGroups && this.mappedAttributeGroups.length > 0) || (this.mappedLocationGroups && this.mappedLocationGroups.length > 0);
	}

	constructor(c: Choice)
	{
		super(c);

		this.showAttributes = false;
		this.choiceImagePath = this.getImage();
	}

	private getImage(): string
	{
		// Get the ChoiceImageAssoc url. Only need one is needed.
		let imagePath = this.choiceImages.length ? this.choiceImages[0].imageUrl : '';

		const options = this.options;

		// Option images has priority over images on a choice, so use if available. 
		if (options.length)
		{
			let option = options.find(x => x.optionImages && x.optionImages.length > 0);

			if (option)
			{
				imagePath = option.optionImages[0].imageURL;
			}
		}

		return imagePath;
	}
}
