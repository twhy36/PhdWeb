import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { filter, map, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { of ,  forkJoin } from 'rxjs';

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
import { OrganizationService } from '../../../../../core/services/organization.service';
import { IdentityService } from 'phd-common/services';
import { Permission } from 'phd-common/models';

@Component({
	selector: 'location-groups-panel',
	templateUrl: './location-groups-panel.component.html',
	styleUrls: ['./location-groups-panel.component.scss']
})
export class LocationGroupsPanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

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
	selectedStatus: string;
	isReadOnly: boolean;

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
			this.resetSearchBar();
		});
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

			this.resetSearchBar();
			this.filterLocationGroups();

			if (this.filteredLocationGroupsList.length > 0)
			{
				this.filteredLocationGroupsList = orderBy(this.filteredLocationGroupsList, [lg => lg.locationGroupName.toLowerCase()]);
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
		this.filterLocationGroups();
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.keyword = event['keyword'];
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
				let splittedKeywords = this.keyword.split(' ');

				splittedKeywords.forEach(k =>
				{
					if (k)
					{
						let filteredResults = this.filterByKeyword(searchFilter, k);

						if (isActiveStatus !== null)
						{
							filteredResults = filteredResults.filter(lg => lg.isActive === isActiveStatus);
						}

						this.filteredLocationGroupsList =
							unionBy(this.filteredLocationGroupsList, filteredResults, 'id');
					}
				});
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

			this._locoService.getLocationGroupsByMarketId(this.currentMarketId, null, top, skip).subscribe(data =>
			{
				if (data.length)
				{
					this.locationGroupsList = unionBy(this.locationGroupsList, data, 'id');
					this.filteredLocationGroupsList = orderBy(this.locationGroupsList, [group => group.locationGroupName.toLowerCase()]);
					this.currentPage++;
				}

				this.allDataLoaded = !data.length || data.length < this.settings.infiniteScrollPageSize;
			});
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
		this.selectedStatus = event;
		this.filterLocationGroups();
	}
}
