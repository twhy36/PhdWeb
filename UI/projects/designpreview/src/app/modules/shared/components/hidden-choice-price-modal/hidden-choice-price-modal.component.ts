import { Component, EventEmitter, Output } from '@angular/core';

@Component({
	selector: 'hidden-choice-price-modal',
	templateUrl: './hidden-choice-price-modal.component.html',
	styleUrls: ['./hidden-choice-price-modal.component.scss']
})
export class HiddenChoicePriceModalComponent
{
	@Output() closeModal = new EventEmitter();

	constructor() { }

	closeClicked()
	{
		this.closeModal.emit();
	}
}
