import { Pipe, PipeTransform } from '@angular/core';

import { DecisionPoint } from 'phd-common';
import { PointStatusFilter } from '../../shared/models/decisionPointFilter';

@Pipe({
	name: 'isFiltered',
	pure: false
})
export class IsFilteredPipe implements PipeTransform
{
	transform(decisionPoint: DecisionPoint, activeFilter: PointStatusFilter): any
	{
		var isFiltered = activeFilter ?
			(activeFilter.statusFilters.length ? activeFilter.statusFilters.includes(decisionPoint.status) : true) : true;

		return isFiltered;
	}
}
