import { Component, Input, ViewChild, Output, EventEmitter, TemplateRef } from '@angular/core';

import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';

@Component({
	selector: 'messages-side-panel',
	templateUrl: './messages-side-panel.component.html',
	styleUrls: ['./messages-side-panel.component.scss']
})
export class MessagesSidePanelComponent
{
	constructor() { }

	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Input() tabsTemplate: TemplateRef<any>;
	@Input() sidePanelOpen = false;
	@Output() sidePanelClose = new EventEmitter<boolean>();

	onCloseClick()
	{
		this.sidePanelClose.emit();
	}
}
