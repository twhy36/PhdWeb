import { Component, OnInit, Input } from '@angular/core';
import { flipOver2, PointStatus } from 'phd-common';

@Component({
	selector: 'status-indicator',
	templateUrl: './status-indicator.component.html',
	styleUrls: ['./status-indicator.component.scss'],
	animations: [flipOver2]
})
export class StatusIndicatorComponent implements OnInit
{
	@Input() pointStatus: PointStatus;
	@Input() isActive = null;

	ePointStatus = PointStatus;
	
	constructor() { }

	ngOnInit()
	{

	}
}
