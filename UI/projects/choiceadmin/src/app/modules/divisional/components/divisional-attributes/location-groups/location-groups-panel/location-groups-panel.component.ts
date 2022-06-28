import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { filter, map, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { of,  forkJoin } from 'rxjs';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { MessageService } from 'primeng/api';

import { unionBy, orderBy } from "lodash";

import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';

import { LocationService } from '../../../../../core/services/location.service';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { SearchBarComponent } from '../../../../../shared/components/search-bar/search-bar.component';

import { SettingsService } from '../../../../../core/services/settings.service';
import { Settings } from '../../../../../shared/models/settings.model';
import { IdentityService, Permission, PhdTableComponent } from 'phd-common';
import { StorageService } from '../../../../../core/services/storage.service';
import { TableLazyLoadEvent, TableSort } from '../../../../../../../../../phd-common/src/lib/components/table/phd-table.model';

@Component({
	selector: 'location-groups-panel',
	templateUrl: './location-groups-panel.component.html',
	styleUrls: ['./location-groups-panel.component.scss']
})
export class LocationGroupsPanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	@ViewChild(PhdTableComponent)
	private tableComponent: PhdTableComponent;

	@Output() onAssociateLocations = new EventEmitter<LocationGroupMarket>();
	@Output() onSidePanelOpen = new EventEmitter<LocationGroupMarket>();

	locationGroupsList: Array<LocationGroupMarket> = [];
	filteredLocationGroupsList: Array<LocationGroupMarket> = [];
	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Location Group Name', field: 'locationGroupName' },
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
	sortField: string = 'locationGroupName';

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
		private _locoService: LocationService,
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


		this.route.parent.paramMap.pipe(
			this.takeUntilDestroyed(),
			filter(p => p.get('marketId') && p.get('marketId') != '0'),
			map(p => +p.get('marketId')),
			distinctUntilChanged(),
			switchMap(marketId =>
			{
				this.currentMarketId = marketId;

				return forkJoin(this._locoService.getLocationGroupsByMarketId(marketId, null, this.settings.infiniteScrollPageSize, 0),
					this._identityService.hasClaimWithPermission('Attributes', Permission.Edit),
					this._identityService.hasMarket(marketId));
			})
		).subscribe(([data, hasPermission, hasMarket]) =>
		{
			this.isReadOnly = !hasPermission || !hasMarket;
			this.locationGroupsList = data;
			this.currentPage = 1;
			this.allDataLoaded = data.length < this.settings.infiniteScrollPageSize;

			this.setSearchBarFilters();
			this.filterLocationGroups();
		});
	}

	setSearchBarFilters()
	{
		let searchBarFilter = this.searchBar.storedSearchBarFilter;

		this.selectedSearchFilter = searchBarFilter?.searchFilter ?? 'All';
		this.keyword = searchBarFilter?.keyword ?? null;
	}

	isLocationGroupSelected(locationGroup: LocationGroupMarket): boolean
	{
		return this.locationGroupsList.some(m => m.locationGroupName === locationGroup.locationGroupName);
	}

	addLocationGroup(locationGroup: LocationGroupMarket)
	{
		if (locationGroup)
		{
			if (locationGroup && !locationGroup.locationMarkets$)
			{
				locationGroup.locationMarkets$ = of([]);
			}

			const index = this.locationGroupsList.findIndex(a => a.id === locationGroup.id);

			if (index === -1)
			{
				this.locationGroupsList.push(locationGroup);
			}
			else
			{
				if (this.locationGroupsList[index].locationMarkets$)
				{
					locationGroup.locationMarkets$ = this.locationGroupsList[index].locationMarkets$;
				}

				this.locationGroupsList[index] = locationGroup;
			}

			this.filterLocationGroups();

			if (this.filteredLocationGroupsList.length > 0)
			{
				this.filteredLocationGroupsList = orderBy(this.filteredLocationGroupsList, [lg => lg.locationGroupName.toLowerCase()]);
			}
		}
	}

	clearFilter()
	{
		this.keyword = null;
		this.selectedSearchFilter = 'All';

		this.filterLocationGroups();
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.searchBar.keyword = this.keyword = event['keyword'].trim();
		this.filterLocationGroups();

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	private onSearchResultUpdated()
	{
		if (this.filteredLocationGroupsList.length === 0)
		{
			this._msgService.clear();

			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
		else
		{
			this.filteredLocationGroupsList = orderBy(this.filteredLocationGroupsList, [lg => lg.locationGroupName.toLowerCase()]);
		}
	}

	private filterLocationGroups()
	{
		this.isSearchingFromServer = false;

		const isActiveStatus = this.selectedStatus ? this.selectedStatus === 'Active' : null;
		let searchFilter = this.searchFilters.find(f => f.name === this.selectedSearchFilter);

		if (searchFilter && this.keyword)
		{
			if (this.allDataLoaded)
			{
				this.filteredLocationGroupsList = [];

				let filteredResults = this.filterByKeyword(searchFilter, this.keyword);

				if (isActiveStatus !== null)
				{
					filteredResults = filteredResults.filter(lg => lg.isActive === isActiveStatus);
				}

				this.filteredLocationGroupsList = unionBy(this.filteredLocationGroupsList, filteredResults, 'id');
			}
			else
			{
				this.filterLocationGroupsFromServer(searchFilter.field, this.keyword, isActiveStatus);
			}
		}
		else if (isActiveStatus !== null)
		{
			if (this.allDataLoaded)
			{
				this.filteredLocationGroupsList = this.locationGroupsList.filter(lg => lg.isActive === isActiveStatus);
			}
			else
			{
				this.filterLocationGroupsFromServer(null, null, isActiveStatus);
			}
		}
		else
		{
			this.filteredLocationGroupsList = orderBy(this.locationGroupsList, [lg => lg.locationGroupName.toLowerCase()]);
		}
	}

	private filterByKeyword(searchFilter: any, keyword: string): Array<LocationGroupMarket>
	{
		let results = [];

		if (searchFilter.name !== 'All')
		{
			results = this.locationGroupsList.filter(loco => this.searchBar.wildcardMatch(loco[searchFilter.field], keyword));
		}
		else if (searchFilter.name === 'All')
		{
			results = this.locationGroupsList.filter(loco =>
			{
				let fields = this.searchFilters.map(f => f.field);

				return fields.some(f => this.searchBar.wildcardMatch(loco[f], keyword));
			});
		}

		return results;
	}

	associateLocations(group: LocationGroupMarket)
	{
		this.onAssociateLocations.emit(group);
	}

	editLocationGroup(group: LocationGroupMarket)
	{
		if (this.isReadOnly)
		{
			return;
		}

		this.onSidePanelOpen.emit(group);
	}

	private filterLocationGroupsFromServer(field: string, keyword: string, status: boolean)
	{
		this.isSearchingFromServer = true;

		keyword = this.searchBar.handleSingleQuotes(keyword);

		this._locoService.getLocationGroupsByMarketId(this.currentMarketId, status, null, null, field, keyword)
			.pipe(finalize(() =>
			{
				this.isSearchingFromServer = false;

				this.onSearchResultUpdated();
			}))
			.subscribe(data =>
			{
				this.filteredLocationGroupsList = data;
			},
			error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Location Group', detail: `An error has occured!` });
			}
		);
	}

	onPanelScroll()
	{
		if (!this.keyword && !this.selectedStatus)
		{
			const top = this.settings.infiniteScrollPageSize;
			const skip = this.currentPage * this.settings.infiniteScrollPageSize;

			this._locoService.getLocationGroupsByMarketId(this.currentMarketId, null, top, skip, null, null, null, this.currentTableSort).subscribe(data =>
			{
				if (data.length)
				{
					// append new data to the existing list
					this.locationGroupsList = unionBy(this.locationGroupsList, data, 'id');
					this.filteredLocationGroupsList = this.locationGroupsList;

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
			this._locoService.getLocationGroupsByMarketId(this.currentMarketId, null, this.settings.infiniteScrollPageSize, 0, null, null, null, this.currentTableSort).subscribe(data =>
			{
				this.locationGroupsList = data;
				this.filteredLocationGroupsList = this.locationGroupsList;
				this.currentPage = 1;
				this.allDataLoaded = !data.length || data.length < this.settings.infiniteScrollPageSize;
			});
		}
		else if (this.allDataLoaded || this.keyword || this.selectedStatus)
		{
			this.tableComponent.sortLazy();
		}
	}

	async createMsgModal(group: LocationGroupMarket)
	{
		if (this.isReadOnly)
		{
			return;
		}

		if (group.isActive)
		{
			let msgBody = `You are about to <span class="font-weight-bold text-danger">inactivate</span> the location group<br><br> `;
			msgBody += `<span class="font-weight-bold">${group.locationGroupName}</span><br><br>`;
			msgBody += `Do you wish to continue?`;

			let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

			confirm.componentInstance.title = 'Warning!';
			confirm.componentInstance.body = msgBody;
			confirm.componentInstance.defaultOption = 'Continue';

			confirm.result.then((result) =>
			{
				if (result == 'Continue')
				{
					this.toggleLocationGroup(group);
				}
			}, (reason) =>
			{

			});
		}
		else
		{
			this.toggleLocationGroup(group);
		}
	}

	toggleLocationGroup(group: LocationGroupMarket)
	{
		this.isSaving = true;
		this.workingId = group.id;

		group.isActive = !group.isActive;

		const groupData = {
			isActive: group.isActive,
			id: group.id
		} as LocationGroupMarket;

		this._locoService.patchLocationGroup(groupData).pipe(
			finalize(() =>
			{
				this.isSaving = false;
				this.workingId = 0;
			})).subscribe(results =>
			{
				// We have two lists, main list and filtered list. The passed in value is from the filtered list, so we need to update the main as well.
				let locGroup = this.locationGroupsList.find(x => x.id === group.id);

				if (locGroup && group.isActive !== locGroup.isActive)
				{
					locGroup.isActive = !locGroup.isActive;
				}

				this.filterLocationGroups();

				this._msgService.add({ severity: 'success', summary: 'Location Group', detail: `Updated successfully!` });
			},
			(error) =>
			{
				group.isActive = !group.isActive;

				this._msgService.add({ severity: 'error', summary: 'Location Group', detail: `An error has occured!` });
			});
	}

	onStatusChanged(event: any)
	{
		this._storageService.setSession('CA_DIV_ATTR_STATUS', event ?? '');

		this.filterLocationGroups();
	}
}
