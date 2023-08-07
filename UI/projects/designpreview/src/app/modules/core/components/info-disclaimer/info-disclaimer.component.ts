import { Component } from '@angular/core';

import { ModalContent } from 'phd-common';
import { Constants } from '../../../shared/classes/constants.class';

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
		return Constants.DIALOG_DISCLAIMER_TITLE;
	}

	get disclaimerText(): string
	{
		return Constants.DISCLAIMER_MESSAGE;
	}

	close(result?: string)
	{
		this.modalRef.close(result);
	}
}
