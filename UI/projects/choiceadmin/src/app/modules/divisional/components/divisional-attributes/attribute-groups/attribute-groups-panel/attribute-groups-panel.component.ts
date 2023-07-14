import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { filter, map, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';
import { MessageService } from 'primeng/api';

import { unionBy, orderBy } from "lodash";

import { AttributeService } from '../../../../../core/services/attribute.service';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { SearchBarComponent } from '../../../../../shared/components/search-bar/search-bar.component';

import { SettingsService } from '../../../../../core/services/settings.service';
import { Settings } from '../../../../../shared/models/settings.model';
import { Constants, IdentityService, Permission } from 'phd-common';
import { StorageService } from '../../../../../core/services/storage.service';
import { PhdTableComponent } from 'phd-common';
import { TableLazyLoadEvent, TableSort } from '../../../../../../../../../phd-common/src/lib/components/table/phd-table.model';

@Component({
	selector: 'attribute-groups-panel',
	templateUrl: './attribute-groups-panel.component.html',
	styleUrls: ['./attribute-groups-panel.component.scss']
})
export class AttributeGroupsPanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	@ViewChild(PhdTableComponent)
	private tableComponent: PhdTableComponent;

	@Output() onAssociateAttributes = new EventEmitter<AttributeGroupMarket>();
	@Output() onEditAttributeGroup = new EventEmitter<AttributeGroupMarket>();

	attributeGroupList: Array<AttributeGroupMarket> = [];
	filteredAttributeGroupList: Array<AttributeGroupMarket> = [];
	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Attribute Group Name', field: 'groupName' },
		{ name: 'Search Tags', field: 'tagsString' }
	];
	selectedSearchFilter: string = 'All';
	keyword: string;
	settings: Settings;
	currentMarketId: number;
	currentPage: number = 0;
	allDataLoaded: boolean;
	isSearchingFromServer: boolean;
	isSaving: boolean = false;
	workingId: number = 0;
	isReadOnly: boolean;
	sortField: string = 'groupName';

	get currentTableSort(): TableSort
	{
		return this.tableComponent.currentTableSort;
	}

	get selectedStatus(): string
	{
		return this._storageService.getSession<string>('CA_DIV_ATTR_STATUS') ?? 'Active';
	}

	get filterGroupNames(): Array<string>
	{
		return this.searchFilters.map(f => f.name);
	}

	constructor(private route: ActivatedRoute,
		private _msgService: MessageService,
		private _modalService: NgbModal,
		private _attrService: AttributeService,
		private _settingsService: SettingsService,
		private _identityService: IdentityService,
		private _storageService: StorageService)
	{
		super();
	}

	ngOnInit()
	{
		this.allDataLoaded = false;
		this.isSearchingFromServer = false;
		this.settings = this._settingsService.getSettings();

		this.route.parent.params.pipe(
			this.takeUntilDestroyed(),
			filter(p => p['marketId'] && p['marketId'] != '0'),
			map(p => +p['marketId']),
			distinctUntilChanged(),
			switchMap(marketId =>
			{
				this.currentMarketId = marketId;

				return forkJoin(this._attrService.getAttributeGroupsByMarketId(marketId, null, this.settings.infiniteScrollPageSize, 0),
					this._identityService.hasClaimWithPermission('Attributes', Permission.Edit),
					this._identityService.hasMarket(marketId));
			})
		).subscribe(([data, hasPermission, hasMarket]) =>
		{
			this.isReadOnly = !hasPermission || !hasMarket;
			this.attributeGroupList = data;
			this.currentPage = 1;
			this.allDataLoaded = data.length < this.settings.infiniteScrollPageSize;

			this.setSearchBarFilters();
			this.filterAttributeGroups();
		});
	}

	setSearchBarFilters()
	{
		let searchBarFilter = this.searchBar.storedSearchBarFilter;

		this.selectedSearchFilter = searchBarFilter?.searchFilter ?? 'All';
		this.keyword = searchBarFilter?.keyword ?? null;
	}

	isAttributeGroupSelected(attributeGroup: AttributeGroupMarket): boolean
	{
		return this.attributeGroupList.some(m => m.groupName === attributeGroup.groupName);
	}

	addAttributeGroup(attributeGroup: AttributeGroupMarket)
	{
		if (attributeGroup)
		{
			if (attributeGroup && !attributeGroup.attributeMarkets$)
			{
				attributeGroup.attributeMarkets$ = of([]);
			}

			const index = this.attributeGroupList.findIndex(a => a.id === attributeGroup.id);

			if (index === -1)
			{
				this.attributeGroupList.push(attributeGroup);
			}
			else
			{
				if (this.attributeGroupList[index].attributeMarkets$)
				{
					attributeGroup.attributeMarkets$ = this.attributeGroupList[index].attributeMarkets$;
				}

				this.attributeGroupList[index] = attributeGroup;
			}

			this.filterAttributeGroups();

			if (this.filteredAttributeGroupList.length > 0)
			{
				this.filteredAttributeGroupList = orderBy(this.filteredAttributeGroupList, [attr => attr.groupName.toLowerCase()]);
			}
		}
	}

	editGroup(attributeGroup: AttributeGroupMarket)
	{
		if (this.isReadOnly)
		{
			return;
		}

		this.onEditAttributeGroup.emit(attributeGroup);
	}

	clearFilter()
	{
		this.keyword = null;
		this.selectedSearchFilter = 'All'

		this.filterAttributeGroups();
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.searchBar.keyword = this.keyword = event['keyword'].trim();
		this.filterAttributeGroups();

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	private onSearchResultUpdated()
	{
		if (this.filteredAttributeGroupList.length === 0)
		{
			this._msgService.clear();

			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
		else
		{
			this.filteredAttributeGroupList = orderBy(this.filteredAttributeGroupList, [attr => attr.groupName.toLowerCase()]);
		}
	}

	private filterAttributeGroups()
	{
		this.isSearchingFromServer = false;

		const isActiveStatus = this.selectedStatus ? this.selectedStatus === 'Active' : null;
		let searchFilter = this.searchFilters.find(f => f.name === this.selectedSearchFilter);

		if (searchFilter && this.keyword)
		{
			if (this.allDataLoaded)
			{
				this.filteredAttributeGroupList = [];

				let filteredResults = this.filterByKeyword(searchFilter, this.keyword);

				if (isActiveStatus !== null)
				{
					filteredResults = filteredResults.filter(attr => attr.isActive === isActiveStatus);
				}

				this.filteredAttributeGroupList = unionBy(this.filteredAttributeGroupList, filteredResults, 'id');
			}
			else
			{
				this.filterAttributeGroupsFromServer(searchFilter.field, this.keyword, isActiveStatus);
			}
		}
		else if (isActiveStatus !== null)
		{
			if (this.allDataLoaded)
			{
				this.filteredAttributeGroupList = this.attributeGroupList.filter(attr => attr.isActive === isActiveStatus);
			}
			else
			{
				this.filterAttributeGroupsFromServer(null, null, isActiveStatus);
			}
		}
		else
		{
			this.filteredAttributeGroupList = orderBy(this.attributeGroupList, [attr => attr.groupName.toLowerCase()]);
		}
	}

	private filterByKeyword(searchFilter: any, keyword: string): Array<AttributeGroupMarket>
	{
		let results = [];

		if (searchFilter.name !== 'All')
		{
			results = this.attributeGroupList.filter(attr => this.searchBar.wildcardMatch(attr[searchFilter.field], keyword));
		}
		else if (searchFilter.name === 'All')
		{
			results = this.attributeGroupList.filter(attr =>
			{
				let fields = this.searchFilters.map(f => f.field);

				return fields.some(f => this.searchBar.wildcardMatch(attr[f], keyword));
			});
		}

		return results;
	}

	associateAttributes(group: AttributeGroupMarket)
	{
		this.onAssociateAttributes.emit(group);
	}

	private filterAttributeGroupsFromServer(field: string, keyword: string, status: boolean)
	{
		this.isSearchingFromServer = true;

		keyword = this.searchBar.handleSingleQuotes(keyword);

		this._attrService.getAttributeGroupsByMarketId(this.currentMarketId, status, null, null, field, keyword)
			.pipe(finalize(() =>
			{
				this.isSearchingFromServer = false;

				this.onSearchResultUpdated();
			}))
			.subscribe(data =>
			{
				this.filteredAttributeGroupList = data;
			},
				error =>
				{
					this._msgService.add({ severity: 'error', summary: 'Attribute Group', detail: `An error has occured!` });
				}
			);
	}

	onPanelScroll()
	{
		if (!this.keyword && !this.selectedStatus)
		{
			const top = this.settings.infiniteScrollPageSize;
			const skip = this.currentPage * this.settings.infiniteScrollPageSize;

			this._attrService.getAttributeGroupsByMarketId(this.currentMarketId, null, top, skip, null, null, null, this.currentTableSort).subscribe(data =>
			{
				if (data.length)
				{
					// append new data to the existing list
					this.attributeGroupList = unionBy(this.attributeGroupList, data, 'id');
					this.filteredAttributeGroupList = this.attributeGroupList;

					// apply sort to the full list
					this.tableComponent.sortLazy();

					this.currentPage++;
				}

				this.allDataLoaded = !data.length || data.length < this.settings.infiniteScrollPageSize;
			});
		}
	}

	/**
	 * The table is flagged as lazy which means any paging, sorting, and/or filtering done will call this method.
	 * @param event
	 */
	lazyLoadData(event: TableLazyLoadEvent)
	{
		if (!this.allDataLoaded && !this.keyword && !this.selectedStatus)
		{
			// return data based on the sort options.  if currentTableSort is null then it will revert to the default sort.
			this._attrService.getAttributeGroupsByMarketId(this.currentMarketId, null, this.settings.infiniteScrollPageSize, 0, null, null, null, this.currentTableSort).subscribe(data =>
			{
				this.attributeGroupList = data;
				this.filteredAttributeGroupList = this.attributeGroupList;
				this.currentPage = 1;
				this.allDataLoaded = !data.length || data.length < this.settings.infiniteScrollPageSize;
			});
		}
		else if (this.allDataLoaded || this.keyword || this.selectedStatus)
		{
			// all the data is either loaded or we are filtering so all the data should be loaded at this time so we can just update the sort.
			this.tableComponent.sortLazy();
		}
	}

	onToggleGroup(group: AttributeGroupMarket)
	{
		if (this.isReadOnly)
		{
			return;
		}

		if (group.isActive)
		{
			let msgBody = `You are about to <span class="font-weight-bold text-danger">inactivate</span> the attribute group<br><br> `;
			msgBody += `<span class="font-weight-bold">${group.groupName}</span><br><br>${Constants.DO_YOU_WISH_TO_CONTINUE}`;

			let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

			confirm.componentInstance.title = Constants.WARNING;
			confirm.componentInstance.body = msgBody;
			confirm.componentInstance.defaultOption = Constants.CONTINUE;

			confirm.result.then((result) =>
			{
				if (result == Constants.CONTINUE)
				{
					this.toggleGroup(group);
				}
			}, (reason) =>
			{

			});
		}
		else
		{
			this.toggleGroup(group);
		}
	}

	toggleGroup(group: AttributeGroupMarket)
	{
		this.isSaving = true;
		this.workingId = group.id;

		group.isActive = !group.isActive;

		this._attrService.updateAttributeGroup(group).pipe(
			finalize(() =>
			{
				this.isSaving = false;
				this.workingId = 0;
			})).subscribe(results =>
			{
				// We have two lists, main list and filtered list. The passed in value is from the filtered list, so we need to update the main as well.
				let attrGroup = this.attributeGroupList.find(x => x.id === group.id);

				if (attrGroup && group.isActive !== attrGroup.isActive)
				{
					attrGroup.isActive = !attrGroup.isActive;
				}

				this.filterAttributeGroups();

				this._msgService.add({ severity: 'success', summary: 'Attribute Group', detail: `Updated successfully!` });
			},
				error =>
				{
					group.isActive = !group.isActive;

					this._msgService.add({ severity: 'error', summary: 'Attribute Group', detail: `An error has occured!` });
				});
	}

	onStatusChanged(event: any)
	{
		this._storageService.setSession('CA_DIV_ATTR_STATUS', event ?? '');

		this.filterAttributeGroups();
	}
}
