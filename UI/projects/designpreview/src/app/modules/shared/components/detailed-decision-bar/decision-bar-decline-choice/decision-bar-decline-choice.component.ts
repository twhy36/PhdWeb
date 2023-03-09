import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { DecisionPoint, Group, Tree, MyFavoritesPointDeclined, ModalRef, ModalService } from 'phd-common';

@Component({
	selector: 'decision-bar-decline-choice',
	templateUrl: './decision-bar-decline-choice.component.html',
	styleUrls: ['./decision-bar-decline-choice.component.scss']
})
export class DecisionBarDeclineChoiceComponent implements OnInit, OnChanges 
{
	@Input() point: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;

	@Output() declineDecisionPoint = new EventEmitter<DecisionPoint>();
	@Output() selectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal;

	isDeclined: boolean = false;
	blockedChoiceModalRef: ModalRef;

	constructor(public modalService: ModalService) { }

	ngOnInit() 
	{
		this.updateIsDeclined();
	}

	ngOnChanges() 
	{
		this.updateIsDeclined();
	}

	updateIsDeclined() 
	{
		this.isDeclined = !!this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === this.point.divPointCatalogId);
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
