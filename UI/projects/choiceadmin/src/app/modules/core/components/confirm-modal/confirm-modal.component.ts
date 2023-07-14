import { Component, Input } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Constants } from 'phd-common';

@Component({
	selector: 'confirm-modal-component',
	templateUrl: './confirm-modal.component.html',
	styleUrls: ['./confirm-modal.component.scss']
})

export class ConfirmModalComponent
{
	@Input() title: string = '';
	@Input() body: string = '';
	@Input() defaultOption: string = Constants.CONTINUE;
	@Input() primaryButton: { hide: boolean, text: string } = { hide: false, text: Constants.CONTINUE };
	@Input() secondaryButton: { hide: boolean, text: string } = { hide: false, text: Constants.CANCEL };

	constructor(public activeModal: NgbActiveModal) { }
}
