import { Component, Input } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Constants } from 'phd-common';

@Component({
	selector: 'info-modal-component',
	templateUrl: './info-modal.component.html',
	styleUrls: ['./info-modal.component.scss']
	})

export class InfoModalComponent
{
	@Input() title: string = '...Something went wrong...';
	@Input() body: string = `
	<p >We had an issue attempting to load the homepage. <br>Please try again later.</p>
	`;
	@Input() buttonText: string = Constants.CLOSE;
	@Input() defaultOption: string = 'Back';
	@Input() isCloseable: boolean = false;
	@Input() isTitleCentered: boolean = false;

	constructor(public activeModal: NgbActiveModal) { }
}
