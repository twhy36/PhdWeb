import { Component, Input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

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

	constructor(public activeModal: NgbActiveModal) { }
}
