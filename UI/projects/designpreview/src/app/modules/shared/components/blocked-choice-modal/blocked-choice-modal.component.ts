import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BlockedByItemList } from '../../models/blocked-by.model';

@Component({
  selector: 'blocked-choice-modal',
  templateUrl: './blocked-choice-modal.component.html',
  styleUrls: ['./blocked-choice-modal.component.scss']
})
export class BlockedChoiceModalComponent implements OnInit {
	@Input() disabledByList: BlockedByItemList;

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
		return {
			andPoints: this.disabledByList?.andPoints.filter(r => r.ruleType === 1),
			andChoices: this.disabledByList?.andChoices.filter(r => r.ruleType === 1),
			orPoints: this.disabledByList?.orPoints.filter(r => r.ruleType === 1),
			orChoices: this.disabledByList?.orChoices.filter(r => r.ruleType === 1)		
		};
	}

	get disabledByMustNotHaveRules()
	{
		return {
			andPoints: this.disabledByList?.andPoints.filter(r => r.ruleType === 2),
			andChoices: this.disabledByList?.andChoices.filter(r => r.ruleType === 2),
			orPoints: this.disabledByList?.orPoints.filter(r => r.ruleType === 2),
			orChoices: this.disabledByList?.orChoices.filter(r => r.ruleType === 2)		
		};
	}

	disabledByRulesExist(mustHave: boolean)
	{
		const disabledRules = mustHave ? this.disabledByMustHaveRules : this.disabledByMustNotHaveRules;
		return disabledRules?.andPoints?.length || disabledRules?.andChoices?.length
			|| disabledRules?.orPoints?.length || disabledRules?.orChoices?.length
	}	
}
