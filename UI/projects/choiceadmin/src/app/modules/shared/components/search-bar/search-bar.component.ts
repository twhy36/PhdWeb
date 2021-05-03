import { Component, Input, Output, EventEmitter } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';

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
	@Input() storageName: string;

	@Output() onClearFilter = new EventEmitter();
	@Output() onKeywordSearch = new EventEmitter();

	isDirty: boolean = false;

	constructor(private _storageService: StorageService) { }

	get searchBarFilter(): SearchBarFilter
	{
		return { searchFilter: this.selectedSearchFilter, keyword: this.keyword } as SearchBarFilter;
	}

	get storedSearchBarFilter(): SearchBarFilter
	{
		return this._storageService.getSession<SearchBarFilter>(this.storageName);
	}

	clearFilter()
	{
		this.keyword = '';
		this.selectedSearchFilter = 'All';

		if (this.storageName)
		{
			this._storageService.setSession(this.storageName, this.searchBarFilter);
		}

		this.onClearFilter.emit();
	}

	keywordSearch = () =>
	{
		if (this.storageName)
		{
			this._storageService.setSession(this.storageName, this.searchBarFilter)
		}

		this.onKeywordSearch.emit(this.searchBarFilter);
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
		if (!source || (keyword === null || keyword === undefined))
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

export class SearchBarFilter
{
	searchFilter: string;
	keyword: string;
}
