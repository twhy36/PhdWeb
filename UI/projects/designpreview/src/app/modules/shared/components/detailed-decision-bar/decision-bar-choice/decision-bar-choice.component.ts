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
export class DecisionBarChoiceComponent 
{
	@Input() choice: ChoiceExt;
	@Input() point: DecisionPoint;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean;

	@Output() toggleChoice = new EventEmitter<ChoiceExt>();
	@Output() viewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() selectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal;
	@ViewChild('hiddenChoicePriceModal') hiddenChoicePriceModal;

	disabledByList: BlockedByItemObject = { pointDisabledByList: null, choiceDisabledByList: null };
	blockedChoiceModalRef: ModalRef;

	constructor(
		public modalService: ModalService,
		private adobeService: AdobeService
	) { }

	clickToggleChoice()
	{
		if (!this.isReadonly)
		{
			this.toggleChoice.emit(this.choice);
		}
	}

	clickViewChoiceDetail()
	{
		this.viewChoiceDetail.emit(this.choice);
	}

	openBlockedChoiceModal() 
	{
		if (!this.disabledByList.choiceDisabledByList && !this.disabledByList.pointDisabledByList) 
		{
			this.disabledByList = getDisabledByList(this.tree, this.groups, this.point, this.choice);
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
