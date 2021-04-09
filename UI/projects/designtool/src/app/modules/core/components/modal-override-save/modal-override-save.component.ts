import { Component, Input } from '@angular/core';

import { ModalContent } from 'phd-common';

@Component({
	selector: 'override-save-component',
	templateUrl: './modal-override-save.component.html',
	styleUrls: ['./modal-override-save.component.scss']
})
export class ModalOverrideSaveComponent extends ModalContent
{
	@Input() title: string = '';
	@Input() body: string =  '';
	@Input() defaultOption: string = 'Continue';

	override = '';

	constructor()
	{
		super();
	}
}
