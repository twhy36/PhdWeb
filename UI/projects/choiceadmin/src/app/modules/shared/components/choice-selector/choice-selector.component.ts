import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
	selector: 'choice-selector',
	templateUrl: 'choice-selector.component.html',
	styleUrls: ['choice-selector.component.scss']
})

export class ChoiceSelectorComponent
{
	@Input() showSearchResults = false;
	@Input() searchResultsCount = 0;
	@Input() selectedChoices: Array<any> = [];
	@Input() searchFilters: Array<string>;
	@Input() selectedSearchFilter: string;
	@Input() selectedLabel: string = '';
	@Input() searchLabel: string = '';
	@Input() displayButtons: boolean = true;
	@Input() keyword: string;
	@Input() searchButtonDisabled: boolean;

	@Output() onClearFilter = new EventEmitter();
	@Output() onKeywordSearch = new EventEmitter<object>();
	@Output() onRemoveItemClick = new EventEmitter<number>();
	@Output() onCancel = new EventEmitter();
	@Output() onSave = new EventEmitter();

	@ViewChild(SearchBarComponent) searchBar: SearchBarComponent;

	private isSaveButtonDisabled: boolean = false;

	constructor(private _loadingService: LoadingService) { }

	ngOnInit() {
		this._loadingService.isSaving$.subscribe( () => {
			this.isSaveButtonDisabled = false;
		});
	}

	clearFilter()
	{
		this.onClearFilter.emit();
	}

	keywordSearch($event)
	{
		this.onKeywordSearch.emit($event);
	}

	removeItemClick(item: any)
	{
		this.onRemoveItemClick.emit(item);
	}

	cancelClick()
	{
		this.onCancel.emit();
	}

	saveClick()
	{
		this.isSaveButtonDisabled = true;
		this.onSave.emit();
	}

	get disableSaveButton()
	{
		return this.isSaveButtonDisabled;
	}

	reset()
	{
		this.searchBar.reset();
		this.isSaveButtonDisabled = false;
	}
}
