import { Component, OnInit, ViewChild, Output, EventEmitter, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { filter, map, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';
import { MessageService } from 'primeng/api';

import { unionBy, orderBy } from "lodash";

import { AttributeService } from '../../../../../core/services/attribute.service';
import { Attribute } from '../../../../../shared/models/attribute.model';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { SearchBarComponent } from '../../../../../shared/components/search-bar/search-bar.component';

import { SettingsService } from '../../../../../core/services/settings.service';
import { Settings } from '../../../../../shared/models/settings.model';
import { StorageService } from '../../../../../core/services/storage.service';
import { Constants, PhdTableComponent } from 'phd-common';
import { TableLazyLoadEvent, TableSort } from '../../../../../../../../../phd-common/src/lib/components/table/phd-table.model';


@Component({
	selector: 'attributes-panel',
	templateUrl: './attributes-panel.component.html',
	styleUrls: ['./attributes-panel.component.scss']
})
export class AttributesPanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	@ViewChild(PhdTableComponent)
	private tableComponent: PhdTableComponent;

	@Output() onEditAttribute = new EventEmitter<Attribute>();

	@Input() isReadOnly: boolean;
	@Input() canEditImages: boolean;

	attributeList: Array<Attribute> = [];
	filteredAttributeList: Array<Attribute> = [];
	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Attribute Name', field: 'name' },
		{ name: 'SKU', field: 'sku' },
		{ name: 'Manufacturer', field: 'manufacturer' },
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
	sortField: string = 'name';

	get currentTableSort(): TableSort
	{
		return this.tableComponent.currentTableSort;
	}

	get selectedStatus(): string
	{
		return this._storageService.getSession<string>('CA_DIV_ATTR_STATUS') ?? 'Active';
	}

	get filterNames(): Array<string>
	{
		return this.searchFilters.map(f => f.name);
	}

	constructor(private route: ActivatedRoute,
		private _msgService: MessageService,
		private _modalService: NgbModal,
		private _attrService: AttributeService,
		private _settingsService: SettingsService,
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

				return this._attrService.getAttributesByMarketId(marketId, null, false, this.settings.infiniteScrollPageSize, 0);
			})
		).subscribe(data =>
		{
			this.attributeList = data;
			this.currentPage = 1;
			this.allDataLoaded = data.length < this.settings.infiniteScrollPageSize;
			this.setSearchBarFilters();
			this.filterAttributes();
		});
	}

	setSearchBarFilters()
	{
		let searchBarFilter = this.searchBar.storedSearchBarFilter;
		this.selectedSearchFilter = searchBarFilter?.searchFilter ?? 'All';
		this.keyword = searchBarFilter?.keyword ?? null;
	}

	isAttributeSelected(attribute: Attribute): boolean
	{
		return this.attributeList.some(m => m.name === attribute.name);
	}

	addAttribute(attribute: Attribute)
	{
		if (attribute)
		{
			const index = this.attributeList.findIndex(x => x.id === attribute.id);

			if (index === -1)
			{
				this.attributeList.push(attribute);
			}
			else
			{
				this.attributeList[index] = attribute;
			}

			this.filterAttributes();

			if (this.filteredAttributeList.length > 0)
			{
				this.filteredAttributeList = orderBy(this.filteredAttributeList, [attr => attr.name.toLowerCase()]);
			}
		}
	}

	clearFilter()
	{
		this.keyword = null;
		this.selectedSearchFilter = 'All'

		this.filterAttributes();
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.searchBar.keyword = this.keyword = event['keyword'].trim();
		this.filterAttributes();

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	private onSearchResultUpdated()
	{
		if (this.filteredAttributeList.length === 0)
		{
			this._msgService.clear();

			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
		else
		{
			this.filteredAttributeList = orderBy(this.filteredAttributeList, [attr => attr.name.toLowerCase()]);
		}
	}

	private filterAttributes()
	{
		this.isSearchingFromServer = false;
		const isActiveStatus = this.selectedStatus ? this.selectedStatus === 'Active' : null;
		let searchFilter = this.searchFilters.find(f => f.name === this.selectedSearchFilter);

		if (searchFilter && this.keyword)
		{
			if (this.allDataLoaded)
			{
				this.filteredAttributeList = [];
				let filteredResults = this.filterByKeyword(searchFilter, this.keyword);

				if (isActiveStatus !== null)
				{
					filteredResults = filteredResults.filter(attr => attr.active === isActiveStatus);
				}

				this.filteredAttributeList = unionBy(this.filteredAttributeList, filteredResults, 'id');
			}
			else
			{
				this.filterAttributesFromServer(searchFilter.field, this.keyword, isActiveStatus);
			}
		}
		else if (isActiveStatus !== null)
		{
			if (this.allDataLoaded)
			{
				this.filteredAttributeList = this.attributeList.filter(attr => attr.active === isActiveStatus);
			}
			else
			{
				this.filterAttributesFromServer(null, null, isActiveStatus);
			}
		}
		else
		{
			this.filteredAttributeList = orderBy(this.attributeList, [attr => attr.name.toLowerCase()]);
		}
	}

	private filterByKeyword(searchFilter: any, keyword: string): Array<Attribute>
	{
		let results = [];

		if (searchFilter.name !== 'All')
		{
			results = this.attributeList.filter(attr => this.searchBar.wildcardMatch(attr[searchFilter.field], keyword));
		}
		else if (searchFilter.name === 'All')
		{
			results = this.attributeList.filter(attr =>
			{
				let fields = this.searchFilters.map(f => f.field);

				return fields.some(f => this.searchBar.wildcardMatch(attr[f], keyword));
			});
		}

		return results;
	}

	private filterAttributesFromServer(field: string, keyword: string, status: boolean)
	{
		this.isSearchingFromServer = true;

		keyword = this.searchBar.handleSingleQuotes(keyword);

		this._attrService.getAttributesByMarketId(this.currentMarketId, status, false, null, null, field, keyword)
			.pipe(finalize(() =>
			{
				this.isSearchingFromServer = false;

				this.onSearchResultUpdated();
			}))
			.subscribe(data =>
			{
				this.filteredAttributeList = data;
			},
				error =>
				{
					this._msgService.add({ severity: 'error', summary: 'Attribute', detail: `An error has occured!` });
				}
			);
	}

	onPanelScroll()
	{
		if (!this.keyword && !this.selectedStatus)
		{
			const top = this.settings.infiniteScrollPageSize;
			const skip = this.currentPage * this.settings.infiniteScrollPageSize;

			this._attrService.getAttributesByMarketId(this.currentMarketId, null, false, top, skip, null, null, this.currentTableSort).subscribe(data =>
			{
				if (data.length)
				{
					// append new data to the existing list
					this.attributeList = unionBy(this.attributeList, data, 'id');
					this.filteredAttributeList = this.attributeList;

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
			this._attrService.getAttributesByMarketId(this.currentMarketId, null, false, this.settings.infiniteScrollPageSize, 0, null, null, this.currentTableSort).subscribe(data =>
			{
				this.attributeList = data;
				this.filteredAttributeList = this.attributeList;
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

	editAttribute(attribute: Attribute)
	{
		if (this.isReadOnly && !this.canEditImages)
		{
			return;
		}

		this.onEditAttribute.emit(attribute);
	}

	onToggleAttribute(attribute: Attribute)
	{
		if (this.isReadOnly)
		{
			return;
		}

		if (attribute.active)
		{
			let msgBody = `You are about to <span class="font-weight-bold text-danger">inactivate</span> the attribute<br><br> `;
			msgBody += `<span class="font-weight-bold">${attribute.name}</span><br><br>${Constants.DO_YOU_WISH_TO_CONTINUE}`;

			let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

			confirm.componentInstance.title = Constants.WARNING;
			confirm.componentInstance.body = msgBody;
			confirm.componentInstance.defaultOption = Constants.CONTINUE;

			confirm.result.then((result) =>
			{
				if (result == Constants.CONTINUE)
				{
					this.toggleAttribute(attribute);
				}
			}, (reason) =>
			{

			});
		}
		else
		{
			this.toggleAttribute(attribute);
		}
	}

	toggleAttribute(attribute: Attribute)
	{
		this.isSaving = true;
		this.workingId = attribute.id;

		attribute.active = !attribute.active;

		this._attrService.updateAttribute(attribute).pipe(
			finalize(() =>
			{
				this.isSaving = false;
				this.workingId = 0;
			})).subscribe(results =>
			{
				// We have two lists, main list and filtered list. The passed in value is from the filtered list, so we need to update the main as well.
				let attr = this.attributeList.find(x => x.id === attribute.id);

				if (attr && attribute.active !== attr.active)
				{
					attr.active = !attr.active;
				}

				this.filterAttributes();

				this._msgService.add({ severity: 'success', summary: 'Attribute', detail: `Updated successfully!` });
			},
				error =>
				{
					attribute.active = !attribute.active;

					this._msgService.add({ severity: 'error', summary: 'Attribute', detail: `An error has occured!` });
				});
	}

	onStatusChanged(event: any)
	{
		this._storageService.setSession('CA_DIV_ATTR_STATUS', event ?? '');

		this.filterAttributes();
	}
}
