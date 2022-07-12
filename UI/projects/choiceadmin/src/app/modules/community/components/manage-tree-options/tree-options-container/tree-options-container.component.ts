import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { UnsubscribeOnDestroy } from '../../../../shared/classes/unsubscribeOnDestroy';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { ITreeOption } from '../../../../shared/models/option.model';
import { UiUtilsService } from '../../../../core/services/ui-utils.service';
import { MessageService } from 'primeng/api';

@Component({
	selector: 'tree-options-container',
	templateUrl: './tree-options-container.component.html',
	styleUrls: ['./tree-options-container.component.scss']
})
export class TreeOptionsContainerComponent extends UnsubscribeOnDestroy
{
	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	@Input() loadingData: boolean;
	@Input() marketCommunityPlanBreadcrumb: string;

	@Output() optionSelected = new EventEmitter<{ item: ITreeOption, tab: string }>();

	optionsList: Array<ITreeOption> = [];

	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Category', field: 'categoryName' },
		{ name: 'Subcategory', field: 'subCategoryName' },
		{ name: 'Option Name', field: 'optionHeaderName' },
		{ name: 'Lawson Number', field: 'id' }
	];
	selectedSearchFilter = 'All';
	keyword: string;

	get filterNames(): Array<string>
	{
		return this.searchFilters.map(f => f.name);
	}

	constructor(
		private route: ActivatedRoute,
		private _uiUtilsService: UiUtilsService,
		private _msgService: MessageService
	) { super(); }

	isOptionSelected(option: ITreeOption): boolean
	{
		return this.optionsList.some(o => o.optionHeaderName === option.optionHeaderName);
	}

	onSelectOption(option: ITreeOption, tab: string)
	{
		this.optionSelected.emit({ item: option, tab: tab });
	}

	resetSearchBar()
	{
		this.selectedSearchFilter = 'All';
		this.searchBar.clearFilter();
	}

	clearFilter()
	{
		this.optionsList.forEach(o => o.matched = true);
	}

	scrollToOption(value: ITreeOption)
	{
		if (value)
		{
			// scroll to point.
			this._uiUtilsService.scrollToId(`option_${value.id}`);
		}
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.keyword = (event['keyword'] as string).toLowerCase();

		this.optionsList.forEach(o =>
		{
			if ((this.keyword === "") ||
				((this.selectedSearchFilter === 'All' || this.selectedSearchFilter === 'Category') && o.categoryName.toLowerCase().includes(this.keyword)) ||
				((this.selectedSearchFilter === 'All' || this.selectedSearchFilter === 'Subcategory') && o.subCategoryName.toLowerCase().includes(this.keyword)) ||
				((this.selectedSearchFilter === 'All' || this.selectedSearchFilter === 'Option Name') && o.optionHeaderName.toLowerCase().includes(this.keyword)) ||
				((this.selectedSearchFilter === 'All' || this.selectedSearchFilter === 'Lawson Number') && o.id.toString().includes(this.keyword)))
			{
				o.matched = true;
			}
			else
			{
				o.matched = false;
			}
		});

		if (this.optionsList.filter(o => o.matched === true).length === 0)
		{
			this._msgService.clear();
			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
	}
}

