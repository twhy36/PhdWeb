import { Component, OnInit, Input, Output, ViewChild, EventEmitter, AfterContentInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs';

import { unionBy, orderBy } from "lodash";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../../../core/components/confirm-modal/confirm-modal.component';

import { AttributeGroupMarket } from '../../models/attribute-group-market.model';
import { LocationGroupMarket } from '../../models/location-group-market.model';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { ActionButton } from '../../models/action-button.model';
import { Constants } from 'phd-common';

@Component({
	selector: 'attribute-group-action-panel',
	templateUrl: './attribute-group-action-panel.component.html',
	styleUrls: ['./attribute-group-action-panel.component.scss']
})
export class AttributeGroupActionPanelComponent implements OnInit, AfterContentInit, AfterViewInit
{
	@ViewChild(SearchBarComponent)
	searchBar: SearchBarComponent;

	@Output() displayErrorMessage = new EventEmitter<string>();
	@Output() isLoadingChange = new EventEmitter<boolean>();
	@Output("onRowReorder") onRowReorderEmitter = new EventEmitter<any>();

	@Input() headerText: string;
	@Input() actionButtons: Array<ActionButton>;
	@Input() tableId: string;
	@Input() searchEnabled: boolean = false;
	@Input() searchResultStyle: string = '';
	@Input() isDisabled: boolean = false;
	@Input() groups: Observable<Array<AttributeGroupMarket | LocationGroupMarket>>;
	@Input() customClass: string = '';
	@Input() customBodyClass: string = '';
	@Input() groupType: string = '';
	@Input() allowMultipleSelect: boolean = true;
	@Input() searchKeyword: string;
	@Input() selectedSearchFilter: string = 'All';
	@Input() selectedGroups: Array<AttributeGroupMarket | LocationGroupMarket> = [];
	@Input() divGroups: Array<AttributeGroupMarket | LocationGroupMarket> = [];
	@Input() canReorderRows: boolean = false;

	groupList: Array<AttributeGroupMarket | LocationGroupMarket> = [];
	searchResultGroups: Array<AttributeGroupMarket | LocationGroupMarket> = [];

	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Group Name', field: this.groupNameField },
		{ name: 'Search Tags', field: 'tagsString' }
	];

	get filterNames(): Array<string>
	{
		return this.searchFilters.map(f => f.name);
	}

	get groupNameField(): string
	{
		return this.groupType === 'location' ? 'locationGroupName' : 'groupName';
	}

	get hasNonDivisionalResults(): boolean
	{
		return this.searchResultGroups.filter(g => !g.isDivisional).length > 0;
	}

	constructor(private _modalService: NgbModal, private cd: ChangeDetectorRef) { }

	ngOnInit(): void
	{
		this.groups.subscribe(grps =>
		{
			this.groupList = grps;

			this.concatDivGroups();

			this.searchResultGroups = this.searchEnabled ? this.searchResultGroups.filter(g => this.groupList.find(grp => grp.id === g.id)) : this.groupList;

			this.orderSearchResultGroups();
		});

		if (!this.selectedSearchFilter)
		{
			this.selectedSearchFilter = 'All';
		}
	}

	ngAfterContentInit()
	{
		this.isLoadingChange.emit(false);
	}

	ngAfterViewInit()
	{
		if (this.searchEnabled && this.searchKeyword)
		{
			let inputSelectedGroups = this.selectedGroups;

			this.searchBar.keyword = this.searchKeyword;
			this.startSearch(this.selectedSearchFilter, this.searchKeyword);

			inputSelectedGroups.map(g => this.setGroupSelected(g, true));

			this.cd.detectChanges();
		}
	}

	onClicked(button: ActionButton)
	{
		if (button && button.action)
		{
			button.action(button);
		}
	}

	reset()
	{
		if (this.searchEnabled)
		{
			this.searchBar.selectedSearchFilter = "All";
			this.searchBar.reset();
		}
		else
		{
			this.selectedGroups = [];
		}
	}

	clearFilter()
	{
		this.searchResultGroups = [];
		this.selectedGroups = [];
		this.displayErrorMessage.emit('');
	}

	keywordSearch(event: any)
	{
		if (this.selectedGroups.length > 0)
		{
			let msgBody = `You are about to start a new search. ${Constants.LOSE_CHANGES}`;

			let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

			confirm.componentInstance.title = Constants.WARNING;
			confirm.componentInstance.body = msgBody;
			confirm.componentInstance.defaultOption = Constants.CANCEL;

			confirm.result.then((result) =>
			{
				if (result == Constants.CONTINUE)
				{
					this.startSearch(event['searchFilter'], event['keyword']);
				}
			}, (reason) =>
			{

			});
		}
		else
		{
			this.startSearch(event['searchFilter'], event['keyword']);
		}
	}

	concatDivGroups()
	{
		// #354898 Only display division-level groups if no tree-level groups are currently associated
		if (this.groupList && !this.groupList.filter(g => !g.isDivisional).length)
		{
			if (this.divGroups && this.divGroups.length)
			{
				// #327666 remove any divisional level groups from the results that may appear twice
				this.groupList = this.groupList.filter(group => !this.divGroups.some(g => g.id === group.id));

				// Add the divisional groups to the result set, this also includes the isDivisional flag for hiding the checkbox
				this.groupList = this.groupList.concat(this.divGroups);
			}
		}
	}

	startSearch(selectedFilter: string, keyword: string)
	{
		keyword = keyword || '';

		this.displayErrorMessage.emit('');
		this.searchResultGroups = [];
		this.selectedGroups = [];

		this.searchFilters.find(x => x.name == 'Group Name').field = this.groupNameField;

		if (this.groupList)
		{
			this.concatDivGroups();

			let searchFilter = this.searchFilters.find(f => f.name === selectedFilter);
			let filteredResults = this.filterByKeyword(searchFilter, keyword);

			this.searchResultGroups = unionBy(this.searchResultGroups, filteredResults, 'id');
		}

		if (this.searchResultGroups.length > 0)
		{
			this.orderSearchResultGroups();
		}
		else
		{
			this.displayErrorMessage.emit('No results found.');
		}
	}

	private orderSearchResultGroups()
	{
		// #327666 remove any divisional results from sorting
		const divResults = this.searchResultGroups.filter(g => g.isDivisional); // Can't use `divGroups` because we want the filtered search list as opposed to the main list
		this.searchResultGroups = this.searchResultGroups.filter(g => !g.isDivisional);

		if (this.groupType === 'sorted-attribute')
		{
			this.searchResultGroups.sort((a: AttributeGroupMarket, b: AttributeGroupMarket) =>
				a.sortOrder < b.sortOrder
					? -1
					: a.sortOrder > b.sortOrder
						? 1
						: a.groupName.localeCompare(b.groupName));
		}
		else
		{
			this.searchResultGroups = orderBy(this.searchResultGroups, [grp =>
			{
				let name = this.groupType === 'location' ? (<LocationGroupMarket>grp).locationGroupName : (<AttributeGroupMarket>grp).groupName;

				return name ? name.toLocaleLowerCase() : '';
			}]);
		}

		// #327666 append the divisional results at the end
		this.searchResultGroups = this.searchResultGroups.concat(divResults);
	}

	private filterByKeyword(searchFilter: any, keyword: string): Array<AttributeGroupMarket | LocationGroupMarket>
	{
		let results = [];

		if (searchFilter.name !== 'All')
		{
			results = this.groupList.filter(grp => this.searchBar.wildcardMatch(grp[searchFilter.field], keyword));
		}
		else if (searchFilter.name === 'All')
		{
			results = this.groupList.filter(grp =>
			{
				let fields = this.searchFilters.map(f => f.field);

				return fields.some(f => this.searchBar.wildcardMatch(grp[f], keyword));
			});
		}
		return results;
	}

	isGroupSelected(group: AttributeGroupMarket | LocationGroupMarket): boolean
	{
		return this.selectedGroups.some(s => s.id === group.id);
	}

	areAllGroupsSelected(): boolean
	{
		return this.searchResultGroups.filter(g => !g.isDivisional).length > 0 && this.selectedGroups.length === this.searchResultGroups.filter(g => !g.isDivisional).length;
	}

	setGroupSelected(group: AttributeGroupMarket | LocationGroupMarket, isSelected: boolean): void
	{
		// clear out previous selections if not allowed multiple.
		if (!this.allowMultipleSelect)
		{
			this.selectedGroups = [];
		}

		// #327666 divisional selections are not allowed
		if (!group.isDivisional)
		{
			let index = this.selectedGroups.findIndex(s => s.id === group.id);

			if (isSelected && index < 0)
			{
				this.selectedGroups.push(group);
			}
			else if (!isSelected && index >= 0)
			{
				this.selectedGroups.splice(index, 1);

				this.selectedGroups = [...this.selectedGroups];
			}
		}
	}

	toggleAllGroups(isSelected: boolean): void
	{
		if (isSelected)
		{
			this.selectedGroups = this.searchResultGroups.filter(g => !g.isDivisional).slice();
		}
		else
		{
			this.selectedGroups = [];
		}
	}

	onRowReorder(event: any)
	{
		this.onRowReorderEmitter.emit(event);
	}
}
