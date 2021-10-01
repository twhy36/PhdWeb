import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { UnsubscribeOnDestroy, TreeFilter } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

@Component({
	selector: 'tree-filter',
	templateUrl: './tree-filter.component.html',
	styleUrls: ['./tree-filter.component.scss']
})
export class TreeFilterComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Output() onSetTreeFilter = new EventEmitter();

	keyword: string = '';
	filterType: string = 'All';
	treeFilter: TreeFilter = { filterType: 'All', keyword: '' };

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario),
		).subscribe(scenario => {
			this.treeFilter = scenario.treeFilter || { filterType: 'All', keyword: '' };
			this.filterType = this.treeFilter.filterType;
			this.keyword = this.treeFilter.keyword;
		});

	}

	keywordSearch()
	{
		if (this.canSearch && (!this.treeFilter || this.treeFilter.keyword !== this.keyword))
		{
			const search = { filterType: this.filterType, keyword: this.keyword };
			this.store.dispatch(new ScenarioActions.SetTreeFilter(search));
			this.onSetTreeFilter.emit();
		}
	}

	clearFilter()
	{
		this.keyword = '';
		this.filterType = 'All';

		if (!this.treeFilter || this.treeFilter.keyword !== this.keyword) {
			const clearFilter = { filterType: this.filterType, keyword: this.keyword };
			this.store.dispatch(new ScenarioActions.SetTreeFilter(clearFilter));
			this.onSetTreeFilter.emit();
		}
	}

	get canSearch(): boolean
	{
		return this.keyword.trim().length >= 3;
	}
}
