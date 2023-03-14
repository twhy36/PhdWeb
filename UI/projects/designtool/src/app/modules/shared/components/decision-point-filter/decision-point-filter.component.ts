import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import * as _ from "lodash";

import { PointStatus, PointStatusFilter } from 'phd-common';

@Component({
	selector: 'decision-point-filter',
	templateUrl: './decision-point-filter.component.html',
	styleUrls: ['./decision-point-filter.component.scss']
})
export class DecisionPointFilterComponent implements OnInit
{
	@Input() pointStatusFilter: PointStatusFilter;

	@Output() pointStatusFilterChanged = new EventEmitter<PointStatusFilter>();

	PointStatus = PointStatus;

	constructor() { }

	ngOnInit()
	{

	}

	onStatusFilterChange(toggledFilter: PointStatus)
	{
		var pointStatusFilter = _.cloneDeep(this.pointStatusFilter);
		const filterAlreadyOn: number = pointStatusFilter.statusFilters.findIndex(f => f === toggledFilter);

		if (filterAlreadyOn > -1)
		{
			pointStatusFilter.statusFilters.splice(filterAlreadyOn, 1);
		}
		else
		{
			pointStatusFilter.statusFilters.push(toggledFilter);
		}

		this.pointStatusFilterChanged.emit(pointStatusFilter);
	}

	resetActionStatusFilters()
	{
		let pointStatusFilter: PointStatusFilter = { statusFilters: [PointStatus.COMPLETED, PointStatus.PARTIALLY_COMPLETED] };

		this.pointStatusFilterChanged.emit(pointStatusFilter);
	}
}
