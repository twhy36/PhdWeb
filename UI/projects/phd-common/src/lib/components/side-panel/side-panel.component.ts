import { Component, Input, TemplateRef, Output, EventEmitter, OnDestroy, OnChanges } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';

@Component({
	selector: 'phd-side-panel-component',
	templateUrl: './side-panel.component.html',
	styleUrls: ['./side-panel.component.scss']
})

export class SidePanelComponent implements OnChanges, OnDestroy
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
	@Input() createDisabledOverlay: boolean = true;

	constructor(private _modalService: NgbModal)
	{
		this.createOverlay();
	}

	ngOnChanges() {
		this.createDisabledOverlay ? this.createOverlay() : this.removeOverlay();
	}

	ngOnDestroy()
	{
		this.removeOverlay();
	}

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

	createOverlay()
	{
		var overlayDiv: HTMLElement = document.getElementById('phd-side-panel-overlay');

		if (!overlayDiv)
		{
			overlayDiv = document.createElement('div');

			overlayDiv.id = 'phd-side-panel-overlay';
			overlayDiv.className = 'phd-side-panel-overlay';

			document.body.appendChild(overlayDiv);
		}
	}

	removeOverlay()
	{
		var overlayDiv = document.getElementById('phd-side-panel-overlay');

		if (overlayDiv)
		{ 
			overlayDiv.remove();
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
