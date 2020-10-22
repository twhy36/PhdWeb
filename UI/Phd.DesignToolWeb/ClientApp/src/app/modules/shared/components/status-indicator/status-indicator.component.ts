import { Component, OnInit, Input } from '@angular/core';

import { PointStatus } from '../../../shared/models/point.model';

import { flipOver2 } from '../../../shared/classes/animations.class';

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
