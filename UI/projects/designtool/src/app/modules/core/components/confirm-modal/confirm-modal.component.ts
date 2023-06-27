import { Component, Input } from '@angular/core';

import { ModalContent, Constants } from 'phd-common';

@Component({
	selector: 'confirm-modal-component',
	templateUrl: './confirm-modal.component.html',
	styleUrls: ['./confirm-modal.component.scss']
})
export class ConfirmModalComponent extends ModalContent
{
	@Input() title = '';
	@Input() body = '';
	@Input() defaultOption = Constants.CONTINUE;
	@Input() primaryButton: { hide: boolean, text: string } = { hide: false, text: Constants.CONTINUE };
	@Input() secondaryButton: { hide: boolean, text: string } = { hide: false, text: Constants.CANCEL };

	constructor()
	{
		super();
	}
}
