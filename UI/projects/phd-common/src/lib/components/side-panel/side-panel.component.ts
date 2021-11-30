import { Component, Input, TemplateRef, Output, EventEmitter } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';


@Component({
	selector: 'phd-side-panel-component',
	templateUrl: './side-panel.component.html',
	styleUrls: ['./side-panel.component.scss']
})

export class SidePanelComponent
{
	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Output() onSidePanelConfirmed = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;
	@Input() customClasses: string = '';

	@Input() headerTemplate: TemplateRef<any>;
	@Input() subheaderTemplate: TemplateRef<any>;
	@Input() bodyTemplate: TemplateRef<any>;
	@Input() footerTemplate: TemplateRef<any>;
	@Input() isDirty: boolean;
	@Input() customMsgBody: string;

	constructor(private _modalService: NgbModal) { }

	toggleSidePanel()
	{
		if (this.isDirty)
		{
			this.showNavAway();
		}
		else
		{
			this.onSidePanelClose.emit(!this.sidePanelOpen);
		}
	}

	showNavAway()
	{
		let msgBody = `If you continue you will lose your changes.<br><br> `;
		msgBody += `Do you wish to continue?`;

		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this.onSidePanelClose.emit(!this.sidePanelOpen);
			}
		}, (reason) => { });
	}

	showCustomConfirm()
	{
		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = 'Attention!';
		confirm.componentInstance.body = this.customMsgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this.onSidePanelConfirmed.emit(!this.sidePanelOpen);
			}
		}, (reason) => { });
	}
}
