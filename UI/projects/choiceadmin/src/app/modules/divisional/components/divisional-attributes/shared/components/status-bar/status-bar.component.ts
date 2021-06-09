import { Component, Output, EventEmitter, Input } from '@angular/core';

import { SelectItem } from 'primeng/api';

@Component({
	selector: 'status-bar',
	templateUrl: './status-bar.component.html',
	styleUrls: ['./status-bar.component.scss']
})
export class StatusBarComponent
{
	@Input() selectedStatus: string;

	@Output() statusChanged = new EventEmitter<string>();

	statuses: SelectItem[] = [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }];
	statusCssStyle = { 'width': '150px' };

	showClear: boolean = true;
		
	constructor() { }

	onStatusChanged(event: any)
	{
		// hide clear button when nothing is selected
		this.showClear = !!event;

		this.statusChanged.emit(event);
	}
}
