import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DecisionPoint, Group, ModalRef, ModalService, Tree } from 'phd-common';
import { BlockedByItemObject } from '../../../models/blocked-by.model';
import { getDisabledByList } from '../../../classes/tree.utils';
import { ChoiceExt } from '../../../models/choice-ext.model';
import { AdobeService } from '../../../../core/services/adobe.service';

@Component({
  selector: 'decision-bar-choice',
  templateUrl: './decision-bar-choice.component.html',
  styleUrls: ['./decision-bar-choice.component.scss']
})
export class DecisionBarChoiceComponent {
	@Input() choice: ChoiceExt;
	@Input() point: DecisionPoint;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean;

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;
	@ViewChild('hiddenChoicePriceModal') hiddenChoicePriceModal: any;

	disabledByList: BlockedByItemObject
		= { pointDisabledByList: null, choiceDisabledByList: null };
	blockedChoiceModalRef: ModalRef;
	hiddenChoicePriceModalRef: ModalRef;

  constructor(
		public modalService: ModalService,
		private adobeService: AdobeService
	) {

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
		if (!this.disabledByList.choiceDisabledByList && !this.disabledByList.pointDisabledByList) {
			this.disabledByList = getDisabledByList(this.tree, this.groups, this.point, this.choice);
		}
		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { windowClass: 'phd-blocked-choice-modal' }, true);
	}

	onCloseClicked() {
		this.blockedChoiceModalRef?.close();
		this.hiddenChoicePriceModalRef?.close();
	}

	onBlockedItemClick()
	{
		this.blockedChoiceModalRef?.close();
	}

	openHiddenChoicePriceModal()
	{
		if (this.choice.priceHiddenFromBuyerView)
		{
			this.hiddenChoicePriceModalRef = this.modalService.open(this.hiddenChoicePriceModal, { windowClass: 'phd-hidden-choice-price-modal' }, true);
			this.adobeService.setAlertEvent('Pricing Varies. Pricing will be determined during your meeting with your Design Consultant.', 'Pricing Varies Alert');
		}
	}
}
