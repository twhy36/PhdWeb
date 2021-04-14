import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { filter, map, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { MessageService } from 'primeng/api';

import { unionBy, orderBy } from "lodash";

import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';

import { Location } from '../../../../../shared/models/location.model';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { SearchBarComponent } from '../../../../../shared/components/search-bar/search-bar.component';
import { Settings } from '../../../../../shared/models/settings.model';

import { SettingsService } from '../../../../../core/services/settings.service';
import { LocationService } from '../../../../../core/services/location.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { IdentityService, Permission } from 'phd-common';

@Component({
	selector: 'locations-panel',
	templateUrl: './locations-panel.component.html',
	styleUrls: ['./locations-panel.component.scss']
})
export class LocationsPanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	@Output() onSidePanelOpen = new EventEmitter<{ event: any, location: Location }>();

	locationsList: Array<Location> = [];
	filteredLocationsList: Array<Location> = [];
	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Location Name', field: 'locationName' },
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
	selectedStatus: string;
	isReadOnly: boolean;

	get filterNames(): Array<string>
	{
		return this.searchFilters.map(f => f.name);
	}

	constructor(private route: ActivatedRoute,
		private _msgService: MessageService,
		private _modalService: NgbModal,
		private _locoService: LocationService,
		private _settingsService: SettingsService,
		private _identityService: IdentityService,
		private _orgService: OrganizationService)
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

				return forkJoin(this._locoService.getLocationsByMarketId(marketId, null, this.settings.infiniteScrollPageSize, 0),
					this._identityService.hasClaimWithPermission('Attributes', Permission.Edit),
					this._identityService.hasMarket(marketId));
			})
		).subscribe(([data, hasPermission, hasMarket]) =>
		{
			this.isReadOnly = !hasPermission || !hasMarket;
			this.locationsList = data;
			this.currentPage = 1;
			this.allDataLoaded = data.length < this.settings.infiniteScrollPageSize;

			this.resetSearchBar();
		});
	}

	isLocationSelected(location: Location): boolean
	{
		return this.locationsList.some(m => m.locationName === location.locationName);
	}

	addLocation(location: Location)
	{
		if (location)
		{
			const index = this.locationsList.findIndex(x => x.id === location.id);

			if (index === -1)
			{
				this.locationsList.push(location);
			}
			else
			{
				this.locationsList[index] = location;
			}

			this.resetSearchBar();
			this.filterLocations();

			if (this.filteredLocationsList.length > 0)
			{
				this.filteredLocationsList = orderBy(this.filteredLocationsList, [loc => loc.locationName.toLowerCase()]);
			}
		}
	}

	resetSearchBar()
	{
		this.selectedSearchFilter = "All";
		this.keyword = '';
		this.searchBar.clearFilter();
	}

	clearFilter()
	{
		this.keyword = null;
		this.filterLocations();
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.keyword = event['keyword'];
		this.filterLocations();

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	private onSearchResultUpdated()
	{
		if (this.filteredLocationsList.length === 0)
		{
			this._msgService.clear();
			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
		else
		{
			this.filteredLocationsList = orderBy(this.filteredLocationsList, [loc => loc.locationName.toLowerCase()]);
		}
	}

	private filterLocations()
	{
		this.isSearchingFromServer = false;

		const isActiveStatus = this.selectedStatus ? this.selectedStatus === 'Active' : null;
		let searchFilter = this.searchFilters.find(f => f.name === this.selectedSearchFilter);

		if (searchFilter && this.keyword)
		{
			if (this.allDataLoaded)
			{
				this.filteredLocationsList = [];
				let splittedKeywords = this.keyword.split(' ');

				splittedKeywords.forEach(k =>
				{
					if (k)
					{
						let filteredResults = this.filterByKeyword(searchFilter, k);

						if (isActiveStatus !== null)
						{
							filteredResults = filteredResults.filter(loc => loc.isActive === isActiveStatus);
						}

						this.filteredLocationsList = unionBy(this.filteredLocationsList, filteredResults, 'id');
					}
				});
			}
			else
			{
				this.filterLocationsFromServer(searchFilter.field, this.keyword, isActiveStatus);
			}
		}
		else if (isActiveStatus !== null)
		{
			if (this.allDataLoaded)
			{
				this.filteredLocationsList = this.locationsList.filter(loc => loc.isActive === isActiveStatus);
			}
			else
			{
				this.filterLocationsFromServer(null, null, isActiveStatus);
			}
		}
		else
		{
			this.filteredLocationsList = orderBy(this.locationsList, [loc => loc.locationName.toLowerCase()]);
		}
	}

	private filterByKeyword(searchFilter: any, keyword: string): Array<Location>
	{
		let results = [];

		if (searchFilter.name !== 'All')
		{
			results = this.locationsList.filter(loco => this.searchBar.wildcardMatch(loco[searchFilter.field], keyword));
		}
		else if (searchFilter.name === 'All')
		{
			results = this.locationsList.filter(loco =>
			{
				let fields = this.searchFilters.map(f => f.field);

				return fields.some(f => this.searchBar.wildcardMatch(loco[f], keyword));
			});
		}

		return results;
	}

	private filterLocationsFromServer(field: string, keyword: string, status: boolean)
	{
		this.isSearchingFromServer = true;

		keyword = this.searchBar.handleSingleQuotes(keyword);

		this._locoService.getLocationsByMarketId(this.currentMarketId, status, null, null, field, keyword)
			.pipe(finalize(() =>
			{
				this.isSearchingFromServer = false;
				this.onSearchResultUpdated();
			}))
			.subscribe(data =>
			{
				this.filteredLocationsList = data;
			},
			error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Location', detail: `An error has occured!` });
			});
	}

	onPanelScroll()
	{
		if (!this.keyword && !this.selectedStatus)
		{
			const top = this.settings.infiniteScrollPageSize;
			const skip = this.currentPage * this.settings.infiniteScrollPageSize;

			this._locoService.getLocationsByMarketId(this.currentMarketId, null, top, skip).subscribe(data =>
			{
				if (data.length)
				{
					this.locationsList = unionBy(this.locationsList, data, 'id');
					this.filteredLocationsList = orderBy(this.locationsList, [location => location.locationName.toLowerCase()]);
					this.currentPage++;
				}

				this.allDataLoaded = !data.length || data.length < this.settings.infiniteScrollPageSize;
			});
		}
	}

	editLocation(event: any, location: Location)
	{
		if (this.isReadOnly)
		{
			return;
		}

		this.onSidePanelOpen.emit({ event: event, location: location });
	}

	async createMsgModal(location: Location)
	{
		if (this.isReadOnly)
		{
			return;
		}

		if (location.isActive)
		{
			let msgBody = `You are about to <span class="font-weight-bold text-danger">inactivate</span> the location<br><br> `;
			msgBody += `<span class="font-weight-bold">${location.locationName}</span><br><br>`;
			msgBody += `Do you wish to continue?`;

			let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

			confirm.componentInstance.title = 'Warning!';
			confirm.componentInstance.body = msgBody;
			confirm.componentInstance.defaultOption = 'Continue';

			confirm.result.then((result) =>
			{
				if (result == 'Continue')
				{
					this.toggleLocation(location);
				}
			},
			(reason) =>
			{

			});
		}
		else
		{
			this.toggleLocation(location);
		}
	}

	toggleLocation(location: Location)
	{
		this.isSaving = true;
		this.workingId = location.id;

		location.isActive = !location.isActive;

		const locationData = {
			isActive: location.isActive,
			id: location.id
		} as Location;

		this._locoService.patchLocation(locationData).pipe(
			finalize(() =>
			{
				this.isSaving = false;
				this.workingId = 0;
			})).subscribe(results =>
			{
				this._msgService.add({ severity: 'success', summary: 'Location', detail: `Updated successfully!` });
			},
			(error) =>
			{
				this._msgService.add({ severity: 'error', summary: 'Location', detail: `An error has occured!` });
			});
	}

	onStatusChanged(event: any)
	{
		this.selectedStatus = event;
		this.filterLocations();
	}
}
