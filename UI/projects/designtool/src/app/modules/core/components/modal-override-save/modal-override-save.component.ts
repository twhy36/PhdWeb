import { Component, Input } from '@angular/core';

import { ModalContent, Constants } from 'phd-common';

@Component({
	selector: 'override-save-component',
	templateUrl: './modal-override-save.component.html',
	styleUrls: ['./modal-override-save.component.scss']
})
export class ModalOverrideSaveComponent extends ModalContent
{
	@Input() title: string = '';
	@Input() body: string = '';
	@Input() defaultOption: string = Constants.CONTINUE;

	override = '';

	constructor()
	{
		super();
	}
}
