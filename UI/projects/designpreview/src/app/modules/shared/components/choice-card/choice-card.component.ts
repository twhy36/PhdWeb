import { Component, Input, Output, OnChanges, SimpleChanges, EventEmitter, ViewChild } from '@angular/core';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver3, OptionImage, DecisionPoint, Group, Tree, ModalService, ModalRef } from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';
import { BlockedByItemObject } from '../../models/blocked-by.model';
import { getDisabledByList } from '../../../shared/classes/tree.utils';
import { AdobeService } from '../../../core/services/adobe.service';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as NavActions from '../../../ngrx-store/nav/actions';

@Component({
	selector: 'choice-card',
	templateUrl: './choice-card.component.html',
	styleUrls: ['./choice-card.component.scss'],
	animations: [
		flipOver3
	]
})
export class ChoiceCardComponent extends UnsubscribeOnDestroy implements OnChanges
{
	@Input() currentChoice: ChoiceExt;
	@Input() currentPoint: DecisionPoint;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean = false;
	@Input() isIncludedOptions: boolean = false;

	@Output() toggled = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onSelectDecisionPoint = new EventEmitter<any>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;
	@ViewChild('hiddenChoicePriceModal') hiddenChoicePriceModal: any;

	choice: ChoiceExt;
	choiceMsg: object[] = [];
	optionImages: OptionImage[];
	imageUrl: string = '';
	blockedChoiceModalRef: ModalRef;
	hiddenChoicePriceModalRef: ModalRef;
	disabledByList: BlockedByItemObject
		= { pointDisabledByList: null, choiceDisabledByList: null };
	choiceDisabledLabel: string;

	constructor(
		private store: Store<fromRoot.State>,
		public modalService: ModalService,
		private adobeService: AdobeService
	) {
		super();
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

	getBodyHeight(): string {
		return this.isPresale ? '260px' : '285px';
	}

	getImagePath(): string
	{
		let imagePath = '';

		if (this.optionImages && this.optionImages.length)
		{
			imagePath = this.optionImages[0].imageURL;
		}
		else if ( this.choice?.hasImage && this.choice?.choiceImages?.length)
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
		event.srcElement.src = 'assets/NoImageAvailable.png';
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

	openBlockedChoiceModal() {
		if (!this.isIncludedOptions) {
			const subGroup = _.flatMap(this.groups, g => _.flatMap(g.subGroups)).find(sg => !!sg.points.find(p => this.currentPoint.id === p.id)) || null;
			this.store.dispatch(new NavActions.SetSelectedSubgroup(subGroup.id, this.currentPoint.id, null));
		}
		
		if (!this.disabledByList.choiceDisabledByList && !this.disabledByList.pointDisabledByList)
		{
			this.disabledByList = getDisabledByList(this.tree, this.groups, this.currentPoint, this.choice);
		}
		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { backdrop: true, windowClass: 'phd-blocked-choice-modal' }, true);
	}

	openHiddenChoicePriceModal() {
		if (this.choice.priceHiddenFromBuyerView)
		{
			this.hiddenChoicePriceModalRef = this.modalService.open(this.hiddenChoicePriceModal, { windowClass: 'phd-hidden-choice-price-modal' }, true);
			this.adobeService.setAlertEvent('Pricing Varies. Pricing will be determined during your meeting with your Design Consultant.', 'Pricing Varies Alert');
		}
	}

	onCloseClicked() {
		this.blockedChoiceModalRef?.close();
		this.hiddenChoicePriceModalRef?.close();
	}

	onBlockedItemClick() {
		this.blockedChoiceModalRef?.close();
	}
}
