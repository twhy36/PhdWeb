import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
	selector: 'search-results',
	templateUrl: 'search-results.component.html',
	styleUrls: ['search-results.component.scss']
})

export class SearchResultsComponent
{
	@Input() showSearchResults = false;
	@Input() searchResultsCount = 0;

	@Output() onClearFilter = new EventEmitter();

	constructor() { }

	clearFilter()
	{
		this.onClearFilter.emit();
	}
}
