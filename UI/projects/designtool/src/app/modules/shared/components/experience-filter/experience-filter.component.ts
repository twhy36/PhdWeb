import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';

import { DecisionPointFilterType } from '../../models/decisionPointFilter';

@Component({
	selector: 'experience-filter',
	templateUrl: './experience-filter.component.html',
	styleUrls: ['./experience-filter.component.scss']
})
export class ExperienceFilterComponent implements OnInit
{
	@Input() selectedPointFilter: DecisionPointFilterType;
	@Input() enabledPointFilters: DecisionPointFilterType[];

	@Output() pointTypeFilterChanged = new EventEmitter<DecisionPointFilterType>();

	selectedFilter: PointFilterOption;
	pointFilterType = DecisionPointFilterType;

	filterOptions: PointFilterOption[] = [];

	constructor() { }

	ngOnInit()
	{
		this.filterOptions = [
			{ filterType: DecisionPointFilterType.FULL, name: 'Full Experience' },
			{ filterType: DecisionPointFilterType.QUICKQUOTE, name: 'Quick Quote Experience' },
			{ filterType: DecisionPointFilterType.STRUCTURAL, name: 'Sales Experience' },
			{ filterType: DecisionPointFilterType.DESIGN, name: 'Design Experience' }
		].filter(o => this.enabledPointFilters.some(f => f === o.filterType));
	}

	onStatusFilterChange(filterOption: DecisionPointFilterType)
	{
		this.pointTypeFilterChanged.emit(filterOption);
	}
}

class PointFilterOption
{
	filterType: DecisionPointFilterType;
	name: string;
}
