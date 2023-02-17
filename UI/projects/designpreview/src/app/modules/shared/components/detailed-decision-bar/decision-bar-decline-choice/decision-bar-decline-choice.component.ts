import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DecisionPoint, Group, Tree, MyFavoritesPointDeclined, ModalRef, ModalService } from 'phd-common';
import { BlockedByItemObject } from '../../../models/blocked-by.model';
import { getDisabledByList } from '../../../classes/tree.utils';

@Component({
  selector: 'decision-bar-decline-choice',
  templateUrl: './decision-bar-decline-choice.component.html',
  styleUrls: ['./decision-bar-decline-choice.component.scss']
})
export class DecisionBarDeclineChoiceComponent implements OnInit {
	@Input() point: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;

	@Output() onDeclineDecisionPoint = new EventEmitter<DecisionPoint>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;

	isDeclined: boolean = false;
	blockedChoiceModalRef: ModalRef;
	disabledByList: BlockedByItemObject
		= { pointDisabledByList: null, choiceDisabledByList: null };

	constructor(public modalService: ModalService) { }

	ngOnInit() {
		this.updateIsDeclined();
	}

	ngOnChanges() {
		this.updateIsDeclined();
	}

	updateIsDeclined() {
		this.isDeclined = !!this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === this.point.divPointCatalogId);
	}

	toggleDecline()
	{
		if (!this.isReadonly)
		{
			this.onDeclineDecisionPoint.emit(this.point);
		}
	}

	openBlockedChoiceModal() {
		if (!this.disabledByList.choiceDisabledByList && !this.disabledByList.pointDisabledByList)
		{
			this.disabledByList = getDisabledByList(this.tree, this.groups, this.point, null);
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
