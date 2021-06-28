import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'blocked-choice-modal',
  templateUrl: './blocked-choice-modal.component.html',
  styleUrls: ['./blocked-choice-modal.component.scss']
})
export class BlockedChoiceModalComponent implements OnInit {
	@Input() disabledByList: {label: string, pointId: number, choiceId?: number, ruleType: number}[] = null;

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

	get disabledByMustHaveRules()
	{
		return this.disabledByList?.filter(r => r.ruleType === 1);
	}

	get disabledByMustNotHaveRules()
	{
		return this.disabledByList?.filter(r => r.ruleType === 2);
	}	
}
