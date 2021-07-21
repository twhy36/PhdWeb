import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { DecisionPoint, Group } from 'phd-common';
import { getDisabledByList } from '../../../classes/tree.utils';
import { MyFavoritesPointDeclined } from '../../../models/my-favorite.model';

@Component({
  selector: 'decision-bar-decline-choice',
  templateUrl: './decision-bar-decline-choice.component.html',
  styleUrls: ['./decision-bar-decline-choice.component.scss']
})
export class DecisionBarDeclineChoiceComponent implements OnInit {
	@Input() point: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];
	@Input() groups: Group[];
	@Input() isReadonly: boolean;

	@Output() onDeclineDecisionPoint = new EventEmitter<DecisionPoint>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;

	isDeclined: boolean = false;
	blockedChoiceModalRef: NgbModalRef;
	disabledByList: {label: string, pointId: number, choiceId?: number, ruleType: number}[] = null;

	constructor(public modalService: NgbModal) { }

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
		if (!this.disabledByList)
		{
			this.disabledByList = getDisabledByList(this.groups, this.point, null);
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
}
