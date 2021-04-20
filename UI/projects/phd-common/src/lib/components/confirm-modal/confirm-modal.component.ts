import { Component, Input } from '@angular/core';

import { ModalContent } from '../../utils/modal.class';

@Component({
	selector: 'confirm-modal-component',
	templateUrl: './confirm-modal.component.html',
	styleUrls: ['./confirm-modal.component.scss']
})
export class ConfirmModalComponent extends ModalContent
{
	@Input() title = '';
	@Input() body = '';
	@Input() defaultOption = 'Continue';
	@Input() primaryButton: { hide: boolean, text: string } = { hide: false, text: 'Continue' };
	@Input() secondaryButton: { hide: boolean, text: string } = { hide: false, text: 'Cancel' };

	constructor()
	{
		super();
	}
}
