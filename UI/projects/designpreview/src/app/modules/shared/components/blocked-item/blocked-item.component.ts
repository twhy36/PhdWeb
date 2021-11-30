import { Component, EventEmitter, Input, Output } from '@angular/core';
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
	@Output() blockedItemClick = new EventEmitter();

	constructor() { }

	onBlockedItemClick(pointId: number) {
		this.blockedItemClick.emit(pointId);
	}
}
