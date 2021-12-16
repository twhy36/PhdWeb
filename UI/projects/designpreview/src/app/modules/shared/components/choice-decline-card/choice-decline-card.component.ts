import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, EventEmitter, ViewChild } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver3, DecisionPoint, Group, Tree, MyFavoritesPointDeclined } from 'phd-common';
import { BlockedByItemList } from '../../models/blocked-by.model';
import { getDisabledByList } from '../../../shared/classes/tree.utils';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { BrandService } from '../../../core/services/brand.service';

import * as _ from 'lodash';

@Component({
	selector: 'choice-decline-card',
	templateUrl: './choice-decline-card.component.html',
	styleUrls: ['./choice-decline-card.component.scss'],
	animations: [
		flipOver3
	]
})
export class ChoiceDeclineCardComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() currentPoint: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[]
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;

	@Output() onDeclineDecisionPoint = new EventEmitter<DecisionPoint>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;

	point: DecisionPoint;
	isDeclined: boolean = false;
	blockedChoiceModalRef: NgbModalRef;
	disabledByList: BlockedByItemList = null;

	constructor(
		public modalService: NgbModal,
		private brandService: BrandService
	) {
		super();
	}

	ngOnInit()
	{
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes['currentPoint'])
		{
			this.point = changes['currentPoint'].currentValue;
			this.isDeclined = !!this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === this.point.divPointCatalogId) && this.point.enabled;
		}
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		event.srcElement.src = this.brandService.getBrandImage('logo');
	}

	toggleDecline()
	{
		if (!this.isReadonly)
		{
			this.onDeclineDecisionPoint.emit(this.point);
		}
	}

	openBlockedChoiceModal() {
		if (!this.disabledByList)
		{
			this.disabledByList = getDisabledByList(this.tree, this.groups, this.currentPoint, null);
		}
		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { windowClass: 'phd-blocked-choice-modal' });
	}

	onCloseClicked() {
		this.blockedChoiceModalRef?.close();
	}

	onBlockedItemClick(pointId: number) {
		this.blockedChoiceModalRef?.close();
		delete this.disabledByList;
		this.onSelectDecisionPoint.emit(pointId);
	}

	getImageSrc() {
		return this.brandService.getBrandImage('logo');
	}
}
