import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
	selector: 'hidden-choice-price-modal',
	templateUrl: './hidden-choice-price-modal.component.html',
	styleUrls: ['./hidden-choice-price-modal.component.scss']
})
export class HiddenChoicePriceModalComponent implements OnInit
{
	@Output() closeModal = new EventEmitter();

	constructor() { }

	ngOnInit(): void
	{
	}

	closeClicked()
	{
		this.closeModal.emit();
	}
}
