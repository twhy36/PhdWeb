import { Component, OnInit, ViewChild } from '@angular/core';

import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';

import { AlertService } from '../../../core/services/alert.service';

@Component({
	selector: 'modal-confirm-action',
	templateUrl: './modal-confirm-action.component.html',
	styleUrls: ['./modal-confirm-action.component.scss']
})
export class ModalConfirmActionComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild('content') content;

	constructor(private alertService: AlertService) { super(); }

	ngOnInit()
	{
		this.alertService.content = this.content;
	}

	cancel()
	{
		this.alertService.close();
	}

	loseChanges()
	{
		this.alertService.continue();
	}
}
