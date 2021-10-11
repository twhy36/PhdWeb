import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, EventEmitter, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver3, OptionImage, DecisionPoint, Group, Tree } from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';
import { getDisabledByList } from '../../../shared/classes/tree.utils';

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
	@Input() currentPoint: DecisionPoint;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;

	@Output() toggled = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;
	@ViewChild('hiddenChoicePriceModal') hiddenChoicePriceModal: any;

	choice: ChoiceExt;
	choiceMsg: object[] = [];
	optionImages: OptionImage[];
	imageUrl: string = '';
	blockedChoiceModalRef: NgbModalRef;
	hiddenChoicePriceModalRef: NgbModalRef;
	disabledByList: { label: string, pointId: number, choiceId?: number, ruleType: number }[] = null;

	constructor(public modalService: NgbModal)
	{
		super();
	}

	ngOnInit() { }

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['currentChoice'])
		{
			this.choice = changes['currentChoice'].currentValue;

			const options = this.choice ? this.choice.options : null;

			if (options && options.length)
			{
				let option = options.find(x => x.optionImages && x.optionImages.length > 0);

				if (option)
				{
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
		else if (this.choice?.choiceImages?.length)
		{
			imagePath = this.choice.choiceImages[0].imageUrl;
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

	toggleChoice()
	{
		if (!this.isReadonly)
		{
			this.toggled.emit(this.choice);
		}
	}

	viewChoiceDetail()
	{
		this.onViewChoiceDetail.emit(this.choice);
	}

	openBlockedChoiceModal()
	{
		if (!this.disabledByList)
		{
			this.disabledByList = getDisabledByList(this.tree, this.groups, this.currentPoint, this.choice);
		}

		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { windowClass: 'phd-blocked-choice-modal' });
	}

	openHiddenChoicePriceModal()
	{
		if (this.choice.priceHiddenFromBuyerView)
		{
			this.hiddenChoicePriceModalRef = this.modalService.open(this.hiddenChoicePriceModal, { windowClass: 'phd-hidden-choice-price-modal' });
		}
	}

	onCloseClicked()
	{
		this.blockedChoiceModalRef?.close();
		this.hiddenChoicePriceModalRef?.close();
	}

	onBlockedItemClick(pointId: number)
	{
		this.blockedChoiceModalRef?.close();

		delete this.disabledByList;

		this.onSelectDecisionPoint.emit(pointId);
	}
}
