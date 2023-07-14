import { Component } from '@angular/core';

import { ModalContent } from 'phd-common';

@Component({
	selector: 'info-disclaimer',
	templateUrl: './info-disclaimer.component.html',
	styleUrls: ['./info-disclaimer.component.scss']
	})
export class InfoDisclaimerComponent extends ModalContent
{
	constructor() { super() }

	get headerText(): string
	{
		return 'Disclaimer'
	}

	close(result?: string)
	{
		this.modalRef.close(result);
	}
}
