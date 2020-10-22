import { Component, Output, EventEmitter } from '@angular/core';

import { SelectItem } from 'primeng/esm5/api/selectitem';

@Component({
	selector: 'status-bar',
	templateUrl: './status-bar.component.html',
	styleUrls: ['./status-bar.component.scss']
})
export class StatusBarComponent
{
	@Output() statusChanged = new EventEmitter<string>();

	selectedStatus: string;

	statuses: SelectItem[] = [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }];
	statusCssStyle = { 'width': '150px' };

	constructor() { }

	onStatusChanged(event: any) {
		this.statusChanged.emit(event);
	}
}
