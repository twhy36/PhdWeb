import { Component, OnInit, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';

import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import { TreeFilter } from '../../models/scenario.model';

@Component({
	selector: 'tree-filter',
	templateUrl: './tree-filter.component.html',
	styleUrls: ['./tree-filter.component.scss']
})
export class TreeFilterComponent implements OnInit
{
	searchFilters: Array<string> = ['All', 'SubGroup', 'Decision Point', 'Choice'];
	keyword: string = '';
	filterType: string = 'All';

	@Input() treeFilter: TreeFilter;

	constructor(private store: Store<fromRoot.State>) { }

	ngOnInit()
	{
		this.treeFilter = this.treeFilter || { filterType: 'All', keyword: '' };
		this.filterType = this.treeFilter.filterType;
		this.keyword = this.treeFilter.keyword;
	}

	keywordSearch()
	{
		if (this.canSearch)
		{
			const search = { filterType: this.filterType, keyword: this.keyword };
			this.store.dispatch(new ScenarioActions.SetTreeFilter(search));
		}
	}

	clearFilter()
	{
		this.keyword = '';
		this.filterType = 'All';
		const clearFilter = { filterType: this.filterType, keyword: this.keyword };
		this.store.dispatch(new ScenarioActions.SetTreeFilter(clearFilter));
	}

	get canSearch(): boolean
	{
		return this.keyword.trim().length >= 3;
	}
}
