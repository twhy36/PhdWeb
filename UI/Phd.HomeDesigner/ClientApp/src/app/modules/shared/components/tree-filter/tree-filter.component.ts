import { Component, OnInit, Input } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import { TreeFilter } from '../../models/scenario.model';

@Component({
	selector: 'tree-filter',
	templateUrl: './tree-filter.component.html',
	styleUrls: ['./tree-filter.component.scss']
})
export class TreeFilterComponent extends UnsubscribeOnDestroy implements OnInit
{
	keyword: string = '';
	filterType: string = 'All';
	treeFilter: TreeFilter;

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit()
	{
		this.treeFilter = this.treeFilter || { filterType: 'All', keyword: '' };
		this.filterType = this.treeFilter.filterType;
		this.keyword = this.treeFilter.keyword;

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario),
		).subscribe(scenario => {
			this.treeFilter = scenario.treeFilter;
		});

	}

	keywordSearch()
	{
		if (this.canSearch && (!this.treeFilter || this.treeFilter.keyword !== this.keyword))
		{
			const search = { filterType: this.filterType, keyword: this.keyword };
			this.store.dispatch(new ScenarioActions.SetTreeFilter(search));
		}
	}

	clearFilter()
	{
		this.keyword = '';
		this.filterType = 'All';

		if (!this.treeFilter || this.treeFilter.keyword !== this.keyword) {
			const clearFilter = { filterType: this.filterType, keyword: this.keyword };
			this.store.dispatch(new ScenarioActions.SetTreeFilter(clearFilter));
		}
	}

	get canSearch(): boolean
	{
		return this.keyword.trim().length >= 3;
	}
}
