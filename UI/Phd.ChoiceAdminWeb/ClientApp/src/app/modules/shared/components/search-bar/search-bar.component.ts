import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
	selector: 'search-bar',
	templateUrl: './search-bar.component.html',
	styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent
{
	@Input() searchFilters: Array<string>;
	@Input() selectedSearchFilter: string;
	@Input() isDisabled: boolean = false;
	@Input() keyword: string;
	@Input() searchButtonDisabled: boolean = false;

	@Output() onClearFilter = new EventEmitter();
	@Output() onKeywordSearch = new EventEmitter();

	isDirty: boolean = false;

	constructor() { }

	clearFilter()
	{
		this.keyword = '';
		this.onClearFilter.emit();
	}

	keywordSearch = () =>
	{
		this.onKeywordSearch.emit({ searchFilter: this.selectedSearchFilter, keyword: this.keyword });
	}

	onSearchFilterChanged(searchFilter: string)
	{
		this.selectedSearchFilter = searchFilter;
		this.isDirty = true;
	}

	onKeywordUp()
	{
		if (!this.isDirty)
		{
			this.isDirty = true;
		}
	}

	reset()
	{
		this.clearFilter();

		this.isDirty = false;
	}

	handleSingleQuotes(keyword: string): string
	{
		if (!keyword)
		{
			return;
		}

		if (keyword.indexOf("'") > -1)
		{
			keyword = keyword.replace(/'/g, "''");
		}

		return keyword;
	}

	wildcardMatch(source: string, keyword: string): boolean
	{
		if (!source || !keyword)
		{
			return false;
		}

		keyword = keyword.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|]/g, "\\$&");
		keyword = keyword.replace(/\*/g, ".*");
		keyword = keyword.replace(/\?/g, ".");

		var regEx = new RegExp(keyword, "i");

		return regEx.test(source);
	}

	validateKeyword(keyword: string): object
	{
		var result = { keyword: keyword, valid: false };

		result.keyword = result.keyword.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|]/g, "");

		if (result.keyword)
		{
			result.keyword = result.keyword.replace(/[\*\?]/g, "");
			result.valid = true;
		}

		return result;
	}
}
