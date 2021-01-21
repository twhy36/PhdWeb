import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, Inject, EventEmitter } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';

import { UnsubscribeOnDestroy, flipOver3, Choice, OptionImage } from 'phd-common';
import { MyFavoritesChoice } from '../../models/my-favorite.model';

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
	@Input() currentChoice: Choice;
	@Input() myFavoritesChoices: MyFavoritesChoice[];

	@Output() toggled = new EventEmitter<Choice>();

	choice: Choice;
	choiceMsg: object[] = [];
	optionImages: OptionImage[];
	imageUrl: string = '';

	constructor(@Inject(APP_BASE_HREF) private _baseHref: string)
	{
		super();
	}

	ngOnInit()
	{
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

	get isSelected()
	{
		return this.myFavoritesChoices 
			? this.myFavoritesChoices.findIndex(x => x.divChoiceCatalogId === this.choice.divChoiceCatalogId) > -1
			: false;
	}
}
