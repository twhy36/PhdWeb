import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'blocked-choice-modal',
  templateUrl: './blocked-choice-modal.component.html',
  styleUrls: ['./blocked-choice-modal.component.scss']
})
export class BlockedChoiceModalComponent implements OnInit {
	@Input() disabledByList: {label: string, pointId: number, choiceId?: number}[] = null;

	@Output() closeModal = new EventEmitter();
	@Output() blockedItemClick = new EventEmitter();

  constructor() { }

  ngOnInit(): void {
  }

	closeClicked() {
		this.closeModal.emit();
	}

	onBlockedItemClick(pointId: number) {
		this.blockedItemClick.emit(pointId);
	}


}
