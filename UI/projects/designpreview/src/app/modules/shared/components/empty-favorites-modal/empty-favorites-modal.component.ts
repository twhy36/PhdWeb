import { Component, Input } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
	selector: 'empty-favorites-modal-component',
	templateUrl: './empty-favorites-modal.component.html',
	styleUrls: ['./empty-favorites-modal.component.scss']
})

export class EmptyFavoritesModalComponent
{
	@Input() title: string = '';
	@Input() body: string =  '';
	@Input() buttonText: string = '';
	@Input() defaultOption: string = 'Back';
	@Input() isCloseable: boolean = false;

	constructor(public activeModal: NgbActiveModal) { }
}
