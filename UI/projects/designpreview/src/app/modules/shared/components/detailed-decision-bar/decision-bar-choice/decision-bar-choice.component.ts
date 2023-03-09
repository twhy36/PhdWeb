import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DecisionPoint, Group, ModalRef, ModalService, Tree } from 'phd-common';
import { ChoiceExt } from '../../../models/choice-ext.model';

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

	blockedChoiceModalRef: ModalRef;

	constructor(
		public modalService: ModalService
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
