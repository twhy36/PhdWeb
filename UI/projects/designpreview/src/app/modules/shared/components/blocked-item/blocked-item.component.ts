import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Choice } from 'phd-common';
import { BlockedByItem } from '../../models/blocked-by.model';

@Component({
  selector: 'blocked-item',
  templateUrl: './blocked-item.component.html',
  styleUrls: ['./blocked-item.component.scss']
})
export class BlockedItemComponent {
	@Input() disabledByItem: BlockedByItem;
	@Input() isChoiceItem: boolean;
	@Input() conjunction: string;
	@Input() hiddenChoices: Choice[];
	@Output() blockedItemClick = new EventEmitter();

	isHiddenChoiceItem: boolean = false;

	constructor() { }

	ngOnInit(): void {
		this.isHiddenChoiceItem = this.hiddenChoices.some(choice => choice.id === this.disabledByItem.choiceId);
	}

	onBlockedItemClick(pointId: number) {
		this.blockedItemClick.emit(pointId);
	}

	displayBlockedItems() {
		return (this.isHiddenChoiceItem || this.disabledByItem.pointId === null) ? 'phd-hidden-item' : 'phd-clickable phd-blocked-link'
	}

}
