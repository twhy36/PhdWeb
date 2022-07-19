import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { SearchBarComponent } from '../search-bar/search-bar.component';

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

	@Input() parentSubject: Observable<boolean>; // child

	private isSaving: boolean = false;

	ngOnInit() {
		this.parentSubject.subscribe( event => {
			this.enableSaveButton();
		});
	}

	constructor() { }

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
		this.isSaving = true;
		this.onSave.emit();
	}

	enableSaveButton() {
		this.isSaving = false;
	}

	get getSaveState()
	{
		return this.isSaving;
	}

	reset()
	{
		this.searchBar.reset();
		this.isSaving = false;
	}
}
