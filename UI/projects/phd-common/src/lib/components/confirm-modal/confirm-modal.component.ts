import { Component, Input } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Constants } from '../../utils/constants.class';

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

	constructor(public activeModal: NgbActiveModal) { }
}
