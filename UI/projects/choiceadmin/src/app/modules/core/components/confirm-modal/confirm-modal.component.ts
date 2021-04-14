import { Component, Input } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
	selector: 'confirm-modal-component',
	templateUrl: './confirm-modal.component.html',
	styleUrls: ['./confirm-modal.component.scss']
})

export class ConfirmModalComponent
{
	@Input() title: string = '';
	@Input() body: string =  '';
	@Input() defaultOption: string = 'Continue';
	@Input() primaryButton: { hide: boolean, text: string } = { hide: false, text: 'Continue' };
	@Input() secondaryButton: { hide: boolean, text: string } = { hide: false, text: 'Cancel' };

	constructor(public activeModal: NgbActiveModal) { }
}
