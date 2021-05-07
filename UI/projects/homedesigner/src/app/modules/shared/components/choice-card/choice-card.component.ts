import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, EventEmitter } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver3, OptionImage, Choice } from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';
import { MyFavoritesPointDeclined } from '../../models/my-favorite.model';

@Component({
	selector: 'choice-card',
	templateUrl: './choice-card.component.html',
	styleUrls: ['./choice-card.component.scss'],
	animations: [
		flipOver3
	]
})
export class ChoiceCardComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() currentChoice: ChoiceExt;
	@Input() isDeclineCard?: boolean = false;
	@Input() decisionPointId?: number;
	@Input() decisionPointLabel?: string = '';
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[]
	
	@Output() toggled = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onDeclineDecisionPoint = new EventEmitter<{ dPointId: number, decisionPointLabel: string }>();

	choice: ChoiceExt;
	isDeclined: boolean = false;
	choiceMsg: object[] = [];
	optionImages: OptionImage[];
	imageUrl: string = '';

	constructor()
	{
		super();
	}

	ngOnInit()
	{
		if (this.isDeclineCard===true) {
			let exists = this.myFavoritesPointsDeclined.find(p => p.dPointId === this.decisionPointId);
			if (exists?.dPointId > 0 && exists?.dPointId === this.decisionPointId) {
				this.isDeclined = true;
			} else {
				this.isDeclined = false;
			}
		}
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['currentChoice'])
		{
			this.choice = changes['currentChoice'].currentValue;

			const options = this.choice ? this.choice.options : null;
			if (options && options.length) {
				let option = options.find(x => x.optionImages && x.optionImages.length > 0);

				if (option) {
					this.optionImages = option.optionImages;
				}
			}

			this.imageUrl = this.getImagePath();
		}
	}

	getImagePath(): string
	{
		let imagePath = '';

		if (this.optionImages && this.optionImages.length)
		{
			imagePath = this.optionImages[0].imageURL;
		}
		else if (this.choice && this.choice.imagePath)
		{
			imagePath = this.choice.imagePath;
		}

		return imagePath;
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		event.srcElement.src = 'assets/pultegroup_logo.jpg';
	}

	toggleChoice() {
		this.toggled.emit(this.choice);
	}

	toggleDecline() {
		this.isDeclined = !this.isDeclined;
		this.onDeclineDecisionPoint.emit({ dPointId: this.decisionPointId, decisionPointLabel: this.decisionPointLabel });
	}

	viewChoiceDetail()
	{
		this.onViewChoiceDetail.emit(this.choice);
	}	
}
