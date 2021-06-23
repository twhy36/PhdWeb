import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { DecisionPoint, Group } from 'phd-common';
import { getDisabledByList } from '../../../classes/tree.utils';
import { ChoiceExt } from '../../../models/choice-ext.model';

@Component({
  selector: 'decision-bar-choice',
  templateUrl: './decision-bar-choice.component.html',
  styleUrls: ['./decision-bar-choice.component.scss']
})
export class DecisionBarChoiceComponent implements OnInit {
	@Input() choice: ChoiceExt;
	@Input() point: DecisionPoint;
	@Input() groups: Group[];

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;

	disabledByList: {label: string, pointId: number, choiceId?: number}[] = null;
	blockedChoiceModalRef: NgbModalRef;

  constructor(public modalService: NgbModal) {

	}

  ngOnInit(): void {
  }

	toggleChoice() {
		this.onToggleChoice.emit(this.choice);
	}

	viewChoiceDetail() {
		this.onViewChoiceDetail.emit(this.choice);
	}

	openBlockedChoiceModal() {
		if (!this.disabledByList) {
			this.disabledByList = getDisabledByList(this.groups, this.point, this.choice);
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
