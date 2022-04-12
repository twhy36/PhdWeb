import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { DecisionPoint, Group, Tree } from 'phd-common';
import { BlockedByItemList } from '../../../models/blocked-by.model';
import { getDisabledByList } from '../../../classes/tree.utils';
import { ChoiceExt } from '../../../models/choice-ext.model';
import { AdobeService } from '../../../../core/services/adobe.service';

@Component({
  selector: 'decision-bar-choice',
  templateUrl: './decision-bar-choice.component.html',
  styleUrls: ['./decision-bar-choice.component.scss']
})
export class DecisionBarChoiceComponent implements OnInit {
	@Input() choice: ChoiceExt;
	@Input() point: DecisionPoint;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;
	@ViewChild('hiddenChoicePriceModal') hiddenChoicePriceModal: any;

	disabledByList: BlockedByItemList = null;
	blockedChoiceModalRef: NgbModalRef;
	hiddenChoicePriceModalRef: NgbModalRef;

  constructor(
		public modalService: NgbModal,
		private adobeService: AdobeService
	) {

	}

  ngOnInit(): void {
  }

	toggleChoice()
	{
		if (!this.isReadonly)
		{
			this.onToggleChoice.emit(this.choice);
		}
	}

	viewChoiceDetail() {
		this.onViewChoiceDetail.emit(this.choice);
	}

	openBlockedChoiceModal() {
		if (!this.disabledByList) {
			this.disabledByList = getDisabledByList(this.tree, this.groups, this.point, this.choice);
		}
		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { windowClass: 'phd-blocked-choice-modal' });
	}

	onCloseClicked() {
		this.blockedChoiceModalRef?.close();
		this.hiddenChoicePriceModalRef?.close();
	}

	onBlockedItemClick(pointId: number) {
		this.blockedChoiceModalRef?.close();
		delete this.disabledByList;
		this.onSelectDecisionPoint.emit(pointId);
	}

	openHiddenChoicePriceModal() {
		if (this.choice.priceHiddenFromBuyerView)
		{
			this.hiddenChoicePriceModalRef = this.modalService.open(this.hiddenChoicePriceModal, { windowClass: 'phd-hidden-choice-price-modal' });
			this.adobeService.setAlertEvent('Pricing Varies. Pricing TBD with Design', 'Pricing Varies Alert');
		}
	}
}
