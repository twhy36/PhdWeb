import { Component, OnInit, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs/observable/forkJoin';

import { filter, map, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { unionBy, orderBy } from "lodash";
import { MessageService } from 'primeng/api';

import { DivisionalOptionService } from '../../../../../core/services/divisional-option.service';
import { SettingsService } from '../../../../../core/services/settings.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { IdentityService } from 'phd-common/services';

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';

import { Settings } from '../../../../../shared/models/settings.model';
import { Option } from '../../../../../shared/models/option.model';

import { ExpansionAssociateCommunitiesTabPanelComponent } from '../expansion-associate-communities-tab-panel/expansion-associate-communities-tab-panel.component';
import { SearchBarComponent } from '../../../../../shared/components/search-bar/search-bar.component';
import { ExpansionLocationGroupsTabPanelComponent } from '../expansion-location-groups-tab-panel/expansion-location-groups-tab-panel.component';
import { ExpansionAttributeGroupsTabPanelComponent } from '../expansion-attribute-groups-tab-panel/expansion-attribute-groups-tab-panel.component';
import { Permission } from 'phd-common/models';

@Component({
	selector: 'divisional-options-panel',
	templateUrl: './divisional-options-panel.component.html',
	styleUrls: ['./divisional-options-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class DivisionalOptionsPanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	isLoading: boolean = false;
	options: Option[] = [];
	filteredOptions: Option[] = [];
	selectedOption: Option = null;
	settings: Settings;
	currentMarketId: number;
	currentPage: number = 0;
	isReadOnly: boolean;

	@Output() onSidePanelOpen = new EventEmitter<{ event: any, option: Option, tab?: string, isReadOnly?: boolean }>();
	@Output() onAssociateAttributeGroups = new EventEmitter<any>();
	@Output() onAssociateLocationGroups = new EventEmitter<any>();
	@Output() onAssociateAttributeGroupsToCommunities = new EventEmitter<any>();
	@Output() onAssociateLocationGroupsToCommunities = new EventEmitter<any>();

	@ViewChild(ExpansionAssociateCommunitiesTabPanelComponent)
	private expansionAssociateCommunitiesTabPanelComponent: ExpansionAssociateCommunitiesTabPanelComponent;

	@ViewChild(ExpansionLocationGroupsTabPanelComponent)
	private expansionLocationGroupsTabPanelComponent: ExpansionLocationGroupsTabPanelComponent;

	@ViewChild(ExpansionAttributeGroupsTabPanelComponent)
	private expansionAttributeGroupsTabPanelComponent: ExpansionAttributeGroupsTabPanelComponent;

	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Lawson Number', field: 'financialOptionIntegrationKey' },
		{ name: 'Option Name', field: 'optionSalesName' },
		{ name: 'Category', field: 'category' },
		{ name: 'Subcategory', field: 'subCategory' }
	];
	selectedSearchFilter: string = 'All';
	keyword: string;
	allDataLoaded: boolean;
	isSearchFilterOn: boolean;
	isSearchingFromServer: boolean;

	get filterNames(): Array<string>
	{
		return this.searchFilters.map(f => f.name);
	}

	get tableMessage(): string
	{
		let msg = '';

		if (this.isLoading)
		{
			msg = 'Loading...';
		}
		else if (!this.isLoading && (!this.options || this.options.length === 0))
		{
			msg = 'No Divisional Options Found.';
		}

		return msg;
	}

	constructor(private route: ActivatedRoute,
		private _divOptService: DivisionalOptionService,
		private cd: ChangeDetectorRef,
		private _settingsService: SettingsService,
		private _msgService: MessageService,
		private _identityService: IdentityService,
		private _orgService: OrganizationService)
	{
		super();
	}

	ngOnInit()
	{
		this.allDataLoaded = false;
		this.isSearchFilterOn = false;
		this.isSearchingFromServer = false;
		this.settings = this._settingsService.getSettings();

		this.route.parent.paramMap.pipe(
			this.takeUntilDestroyed(),
			filter(p => p.get('marketId') && p.get('marketId') != '0'),
			map(p => +p.get('marketId')),
			distinctUntilChanged(),
			switchMap(marketId =>
			{
				this.isLoading = true;
				this.currentMarketId = marketId;
				this.options = [];
				this.performChangeDetection();

				return forkJoin(
					this._divOptService.getDivisionalOptions(marketId, this.settings.infiniteScrollPageSize, 0),
					this._identityService.hasClaimWithPermission('Attributes', Permission.Edit),
					this._identityService.hasMarket(marketId));
			})
		).subscribe(([data, hasPermission, hasMarket]) =>
		{
			this.isReadOnly = !hasPermission || !hasMarket;
			this.options = data;
			this.currentPage = 1;
			this.allDataLoaded = data.length < this.settings.infiniteScrollPageSize;
			this.resetSearchBar();
			this.isLoading = false;
			this.performChangeDetection();
		});
	}

	editOption(event: any, option: Option, tab?: string)
	{
		this.onSidePanelOpen.emit({ event: event, option: option, tab: tab, isReadOnly: this.isReadOnly });
	}

	associateAttributeGroups(event: any)
	{
		this.onAssociateAttributeGroups.emit(event);
	}

	associateLocationGroups(event: any)
	{
		this.onAssociateLocationGroups.emit(event);
	}

	associateAttributeGroupsToCommunities(event: any)
	{
		this.onAssociateAttributeGroupsToCommunities.emit(event);
	}

	associateLocationGroupsToCommunities(event: any)
	{
		this.onAssociateLocationGroupsToCommunities.emit(event);
	}

	performChangeDetection()
	{
		this.cd.detectChanges();
	}

	disassociateLocationGroups(event: any)
	{
		this.performChangeDetection();
	}

	onPanelScroll()
	{
		if (!this.isSearchFilterOn)
		{
			const top = this.settings.infiniteScrollPageSize;
			const skip = this.currentPage * this.settings.infiniteScrollPageSize;

			this._divOptService.getDivisionalOptions(this.currentMarketId, top, skip).subscribe(data =>
			{
				if (data.length)
				{
					this.options = unionBy(this.options, data, 'id');
					this.filteredOptions = orderBy(this.options, ['category', 'subCategory', 'optionSalesName']);
					this.currentPage++;
					this.performChangeDetection();
				}

				this.allDataLoaded = !data.length || data.length < this.settings.infiniteScrollPageSize;
			});
		}
	}

	/**
	 * Used to call functions when changing tabs
	 * event.index:
	 *	0 = Attribute Groups
	 *	1 = Location Groups
	 *	2 = Associate Communities
	 * @param event
	 */
	onTabChange(event: any)
	{
		if (event.index === 0)
		{
			// clear selected groups
			this.expansionAttributeGroupsTabPanelComponent.toggleAllGroups(false);
		}
		else if (event.index === 1)
		{
			// clear selected groups
			this.expansionLocationGroupsTabPanelComponent.toggleAllGroups(false);
		}
		else if (event.index === 2)
		{
			if (this.expansionAssociateCommunitiesTabPanelComponent)
			{
				// close all opened panels 
				this.expansionAssociateCommunitiesTabPanelComponent.toggleCommunities();
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
		this.filteredOptions = orderBy(this.options, ['category', 'subCategory', 'optionSalesName']);
		this.isSearchFilterOn = false;
		this.performChangeDetection();
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.keyword = event['keyword'];
		this.filterOptions(this.selectedSearchFilter, this.keyword);

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	private onSearchResultUpdated()
	{
		if (this.filteredOptions.length === 0)
		{
			this._msgService.clear();
			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
		else
		{
			this.filteredOptions = orderBy(this.filteredOptions, ['category', 'subCategory', 'optionSalesName']);
		}

		this.performChangeDetection();
	}

	private filterOptions(filter: string, keyword: string)
	{
		this.isSearchingFromServer = false;
		let searchFilter = this.searchFilters.find(f => f.name === filter);

		if (searchFilter && this.keyword)
		{
			if (this.allDataLoaded)
			{
				this.filteredOptions = [];
				let splittedKeywords = keyword.split(' ');

				splittedKeywords.forEach(k =>
				{
					if (k)
					{
						let filteredResults = this.filterByKeyword(searchFilter, k);
						this.filteredOptions = unionBy(this.filteredOptions, filteredResults, 'id');
					}
				});
			}
			else
			{
				this.filterOptionsFromServer(searchFilter, this.keyword);
			}
		}
		else
		{
			this.clearFilter();
		}
	}

	private filterByKeyword(searchFilter: any, keyword: string): Array<Option>
	{
		let results = [];

		if (searchFilter.name !== 'All')
		{
			results = this.options.filter(option => this.searchBar.wildcardMatch(option[searchFilter.field], keyword));
		}
		else if (searchFilter.name === 'All')
		{
			results = this.options.filter(option =>
			{
				let fields = this.searchFilters.map(f => f.field);

				return fields.some(f => this.searchBar.wildcardMatch(option[f], keyword));
			});
		}

		return results;
	}

	private filterOptionsFromServer(searchFilter: any, keyword: string)
	{		
		this.isSearchingFromServer = true;

		keyword = this.searchBar.handleSingleQuotes(keyword);

		this._divOptService.getDivisionalOptions(this.currentMarketId, null, null, searchFilter.field, keyword).subscribe(data =>
		{
			this.filteredOptions = data;
			this.isSearchFilterOn = true;
			this.isSearchingFromServer = false;
			this.onSearchResultUpdated();
		});
	}
}
