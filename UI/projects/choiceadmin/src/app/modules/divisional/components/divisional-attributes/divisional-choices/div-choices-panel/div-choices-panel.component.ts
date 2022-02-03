import { Component, OnInit, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import { filter, map, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { unionBy, orderBy } from "lodash";
import { MessageService } from 'primeng/api';

import { DivisionalService } from '../../../../../core/services/divisional.service';
import { SettingsService } from '../../../../../core/services/settings.service';
import { IdentityService, Permission, PhdTableComponent } from 'phd-common';

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';

import { Settings } from '../../../../../shared/models/settings.model';

import { SearchBarComponent } from '../../../../../shared/components/search-bar/search-bar.component';
import { TableLazyLoadEvent, TableSort } from '../../../../../../../../../phd-common/src/lib/components/table/phd-table.model';
import { ExpansionChoiceCommunitiesTabPanelComponent } from '../expansion-communities-tab-panel/expansion-communities-tab-panel.component';
import { ExpansionChoiceLocationGroupsTabPanelComponent } from '../expansion-location-groups-tab-panel/expansion-location-groups-tab-panel.component';
import { ExpansionChoiceAttributeGroupsTabPanelComponent } from '../expansion-attribute-groups-tab-panel/expansion-attribute-groups-tab-panel.component';
import { DivisionalChoice } from '../../../../../shared/models/divisional-catalog.model';
import { ExpansionChoiceImagesTabPanelComponent } from '../expansion-images-tab-panel/expansion-images-tab-panel.component';

@Component({
	selector: 'div-choices-panel',
	templateUrl: './div-choices-panel.component.html',
	styleUrls: ['./div-choices-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class DivChoicesPanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	isLoading: boolean = false;
	choices: DivisionalChoice[] = [];
	filteredChoices: DivisionalChoice[] = [];
	selectedChoice: DivisionalChoice = null;
	settings: Settings;
	currentMarketId: number;
	currentPage: number = 0;
	isReadOnly: boolean;
	sortField: TableSort = new TableSort({ multiSortMeta: [{ field: 'groupLabel', order: 1 }, { field: 'subGroupLabel', order: 1 }, { field: 'pointLabel', order: 1 }, { field: 'choiceLabel', order: 1 }] });
	
	@Output() onAssociateAttributeGroups = new EventEmitter<any>();
	@Output() onAssociateLocationGroups = new EventEmitter<any>();
	@Output() onAssociateAttributeGroupsToCommunities = new EventEmitter<any>();
	@Output() onAssociateLocationGroupsToCommunities = new EventEmitter<any>();
	@Output() onAssociateImagesToCommunities = new EventEmitter<any>();

	@ViewChild(ExpansionChoiceCommunitiesTabPanelComponent)
	private expansionChoiceCommunitiesTabPanelComponent: ExpansionChoiceCommunitiesTabPanelComponent;

	@ViewChild(ExpansionChoiceLocationGroupsTabPanelComponent)
	private expansionChoiceLocationGroupsTabPanelComponent: ExpansionChoiceLocationGroupsTabPanelComponent;

	@ViewChild(ExpansionChoiceImagesTabPanelComponent)
	private expansionChoiceImagesTabPanelComponent: ExpansionChoiceImagesTabPanelComponent;

	@ViewChild(ExpansionChoiceAttributeGroupsTabPanelComponent)
	private expansionChoiceAttributeGroupsTabPanelComponent: ExpansionChoiceAttributeGroupsTabPanelComponent;

	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	@ViewChild(PhdTableComponent)
	private tableComponent: PhdTableComponent;

	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Choice Name', field: 'choiceLabel' },
		{ name: 'Decision Point', field: 'pointLabel' },
		{ name: 'SubGroups', field: 'subGroupLabel' },
		{ name: 'Groups', field: 'groupLabel' }
	];
	selectedSearchFilter: string = 'All';
	keyword: string;
	allDataLoaded: boolean;
	isSearchFilterOn: boolean;
	isSearchingFromServer: boolean;

	get currentTableSort(): TableSort
	{
		return this.tableComponent.currentTableSort;
	}

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
		else if (!this.isLoading && (!this.choices || this.choices.length === 0))
		{
			msg = 'No Divisional Choices Found.';
		}

		return msg;
	}

	constructor(private route: ActivatedRoute,
		private _divService: DivisionalService,
		private cd: ChangeDetectorRef,
		private _settingsService: SettingsService,
		private _msgService: MessageService,
		private _identityService: IdentityService)
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
				this.choices = [];
				this.performChangeDetection();

				return forkJoin(
					this._divService.getDivisionalChoices(marketId, this.settings.infiniteScrollPageSize, 0),
					this._identityService.hasClaimWithPermission('DivisionChoices', Permission.Edit),
					this._identityService.hasMarket(marketId));
			})
		).subscribe(([data, hasPermission, hasMarket]) =>
		{
			this.isReadOnly = !hasPermission || !hasMarket;
			this.choices = data;
			this.currentPage = 1;
			this.allDataLoaded = data.length < this.settings.infiniteScrollPageSize;
			this.resetSearchBar();
			this.isLoading = false;

			this.performChangeDetection();
		});
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

	associateImagesToCommunities(event: any)
	{
		this.onAssociateImagesToCommunities.emit(event);
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
		// all data will be loaded if user is searching by text
		if (!this.isSearchFilterOn)
		{
			const top = this.settings.infiniteScrollPageSize;
			const skip = this.currentPage * this.settings.infiniteScrollPageSize;

			this._divService.getDivisionalChoices(this.currentMarketId, top, skip, null, null, this.currentTableSort).subscribe(data =>
			{
				if (data.length)
				{
					// append new data to the existing list
					this.choices = unionBy(this.choices, data, 'divChoiceCatalogId');
					this.filteredChoices = this.choices;

					// apply sort to the full list
					this.tableComponent.sortLazy();

					this.currentPage++;

					this.performChangeDetection();
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
		if (!this.allDataLoaded && !this.isSearchFilterOn)
		{
			// return data based on the sort options.  if currentTableSort is null then it will revert to the default sort.
			this._divService.getDivisionalChoices(this.currentMarketId, this.settings.infiniteScrollPageSize, 0, null, null, this.currentTableSort).subscribe(data =>
			{
				this.choices = data;
				this.filteredChoices = this.choices;
				this.currentPage = 1;
				this.allDataLoaded = !data.length || data.length < this.settings.infiniteScrollPageSize;

				this.performChangeDetection();
			});
		}
		else if (this.allDataLoaded || this.isSearchFilterOn)
		{
			// all the data is either loaded or we are filtering so all the data should be loaded at this time so we can just update the sort.				
			this.tableComponent.sortLazy();
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
			this.expansionChoiceAttributeGroupsTabPanelComponent.toggleAllGroups(false);
		}
		else if (event.index === 1)
		{
			if (this.expansionChoiceLocationGroupsTabPanelComponent)
			{
				// clear selected groups
				this.expansionChoiceLocationGroupsTabPanelComponent.toggleAllGroups(false);
			}
		}
		else if (event.index === 2)
		{
			if (this.expansionChoiceImagesTabPanelComponent)
			{
				// clear selected images
				this.expansionChoiceImagesTabPanelComponent.toggleAllImages(false);
			}
		}
		else if (event.index === 3)
		{
			if (this.expansionChoiceCommunitiesTabPanelComponent)
			{
				// close all opened panels 
				this.expansionChoiceCommunitiesTabPanelComponent.toggleCommunities();
			}
		}
	}

	resetSearchBar()
	{
		this.selectedSearchFilter = 'All';
		this.keyword = '';

		this.searchBar.clearFilter();
	}

	clearFilter()
	{
		this.filteredChoices = orderBy(this.choices, ['groupLabel', 'subGroupLabel', 'pointLabel', 'choiceLabel']);
		this.isSearchFilterOn = false;

		this.performChangeDetection();
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.keyword = event['keyword'];

		this.filterChoices(this.selectedSearchFilter, this.keyword);

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	private onSearchResultUpdated()
	{
		if (this.filteredChoices.length === 0)
		{
			this._msgService.clear();

			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
		else
		{
			this.filteredChoices = orderBy(this.filteredChoices, ['groupLabel', 'subGroupLabel', 'pointLabel', 'choiceLabel']);
		}

		this.performChangeDetection();
	}

	private filterChoices(filter: string, keyword: string)
	{
		this.isSearchingFromServer = false;

		let searchFilter = this.searchFilters.find(f => f.name === filter);

		if (searchFilter && this.keyword)
		{
			if (this.allDataLoaded)
			{
				this.filteredChoices = [];

				let filteredResults = this.filterByKeyword(searchFilter, keyword);

				this.filteredChoices = unionBy(this.filteredChoices, filteredResults, 'divChoiceCatalogId');
			}
			else
			{
				this.filterChoicesFromServer(searchFilter, this.keyword);
			}
		}
		else
		{
			this.clearFilter();
		}
	}

	private filterByKeyword(searchFilter: any, keyword: string): Array<DivisionalChoice>
	{
		let results = [];

		if (searchFilter.name !== 'All')
		{
			results = this.choices.filter(choice => this.searchBar.wildcardMatch(choice[searchFilter.field], keyword));
		}
		else if (searchFilter.name === 'All')
		{
			results = this.choices.filter(choice =>
			{
				let fields = this.searchFilters.map(f => f.field);

				return fields.some(f => this.searchBar.wildcardMatch(choice[f], keyword));
			});
		}

		return results;
	}

	/**
	 * Filter results based on user search criteria
	 * @param searchFilter
	 * @param keyword
	 */
	private filterChoicesFromServer(searchFilter: any, keyword: string)
	{
		this.isSearchingFromServer = true;

		keyword = this.searchBar.handleSingleQuotes(keyword);

		// return all data for the term entered by the user
		this._divService.getDivisionalChoices(this.currentMarketId, null, null, searchFilter.field, keyword).subscribe(data =>
		{
			this.filteredChoices = data;
			this.isSearchFilterOn = true;
			this.isSearchingFromServer = false;

			this.onSearchResultUpdated();
		});
	}
}
