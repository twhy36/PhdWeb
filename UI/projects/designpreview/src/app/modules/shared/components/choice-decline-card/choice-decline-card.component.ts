import { Component, Input, Output, OnChanges, SimpleChanges, EventEmitter, ViewChild } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver3, DecisionPoint, Group, Tree, MyFavoritesPointDeclined, ModalRef, ModalService } from 'phd-common';
import { BlockedByItemObject } from '../../models/blocked-by.model';
import { getDisabledByList } from '../../../shared/classes/tree.utils';

import * as _ from 'lodash';

@Component({
	selector: 'choice-decline-card',
	templateUrl: './choice-decline-card.component.html',
	styleUrls: ['./choice-decline-card.component.scss'],
	animations: [
		flipOver3
	]
})
export class ChoiceDeclineCardComponent extends UnsubscribeOnDestroy implements OnChanges
{
	@Input() currentPoint: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[]
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean = false;

	@Output() declineDecisionPoint = new EventEmitter<DecisionPoint>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal;

	point: DecisionPoint;
	isDeclined: boolean = false;
	blockedChoiceModalRef: ModalRef;
	disabledByList: BlockedByItemObject
		= { pointDisabledByList: null, choiceDisabledByList: null };
	imageSrc: string = 'assets/nographicgrey-removebg-preview.png'

	constructor(
		public modalService: ModalService
	) 
	{
		super();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['currentPoint'])
		{
			this.point = changes['currentPoint'].currentValue;
			this.isDeclined = !!this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === this.point.divPointCatalogId) && this.point.enabled;
		}
	}

	getBodyHeight(): string
	{
		return this.isPresale ? '260px' : '285px';
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event)
	{
		event.srcElement.src = this.imageSrc;
	}

	toggleDecline()
	{
		if (!this.isReadonly)
		{
			this.declineDecisionPoint.emit(this.point);
		}
	}

	openBlockedChoiceModal()
	{
		if (!this.disabledByList.choiceDisabledByList && !this.disabledByList.pointDisabledByList)
		{
			this.disabledByList = getDisabledByList(this.tree, this.groups, this.currentPoint, null);
		}
		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { backdrop: true, windowClass: 'phd-blocked-choice-modal' }, true);
	}

	onCloseClicked()
	{
		this.blockedChoiceModalRef?.close();
	}

	onBlockedItemClick()
	{
		this.blockedChoiceModalRef?.close();
	}
}
