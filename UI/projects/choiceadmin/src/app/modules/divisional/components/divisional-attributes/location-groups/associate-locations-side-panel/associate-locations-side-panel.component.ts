import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { filter, map, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';

import { Message } from 'primeng/api';
import { unionBy } from "lodash";

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { LocationService } from '../../../../../core/services/location.service';
import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { Location } from '../../../../../shared/models/location.model';
import { SearchBarComponent } from '../../../../../shared/components/search-bar/search-bar.component';

@Component({
	selector: 'associate-locations-side-panel',
	templateUrl: './associate-locations-side-panel.component.html',
	styleUrls: ['./associate-locations-side-panel.component.scss']
})
export class AssociateLocationsSidePanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

	group: LocationGroupMarket;
	locations: Array<Location>;
	isSaving: boolean = false;
	errors: Array<Message> = [];
	callback?: (loco: Array<Location>) => void;

	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Name', field: 'locationName' },
		{ name: 'Search Tags', field: 'tagsString' }
	];
	selectedSearchFilter: string = 'All';

	get filterNames(): Array<string>
	{
		return this.searchFilters.map(f => f.name);
	}

	allLocationsInMarket: Array<Location> = [];
	locationsInMarket: Array<Location> = [];
	filteredLocations: Array<Location> = [];
	selectedLocations: Array<Location> = [];

	get sidePanelHeader(): string
	{
		return 'Associate Locations to Group';
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = this.selectedLocations.length === 0 || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private _modalService: NgbModal, private route: ActivatedRoute, private _locoService: LocationService) { super(); }

	ngOnInit()
	{
		this.route.parent.paramMap.pipe(
			this.takeUntilDestroyed(),
			filter(p => p.get('marketId') && p.get('marketId') != '0'),
			map(p => +p.get('marketId')),
			distinctUntilChanged(),
			switchMap(marketId => this._locoService.getLocationsByMarketId(marketId, true))
		).subscribe(data =>
		{
			this.allLocationsInMarket = data;

			this.filterAssociatedLocations();
		});
	}

	onCloseSidePanel(status: boolean)
	{
		this.searchBar.selectedSearchFilter = "All";
		this.searchBar.reset();
		this.errors = [];
		this.sidePanel.isDirty = false;
		this.onSidePanelClose.emit(status);
	}

	toggleSidePanel()
	{
		if (this.selectedLocations.length > 0)
		{
			this.sidePanel.setIsDirty();
		}

		this.sidePanel.toggleSidePanel();
	}

	filterAssociatedLocations()
	{
		this.locationsInMarket = this.group ? this.allLocationsInMarket.filter(loco => !this.locations.some(x => x.id === loco.id)) : this.allLocationsInMarket;
	}

	saveAndClose()
	{
		this.errors = [];
		this.isSaving = true;
		let newlySelectedLocations = this.selectedLocations.filter(s => this.locations.findIndex(x => x.id === s.id) < 0);
		let locationIds = newlySelectedLocations.map(loc => loc.id);

		this._locoService.updateLocationAssociations(this.group.id, locationIds, false).subscribe(group =>
		{
			if (this.callback)
			{
				this.callback(this.locations.concat(newlySelectedLocations));
			}

			this.isSaving = false;
			this.sidePanel.isDirty = false;

			this.sidePanel.toggleSidePanel();
		},
		error =>
		{
			this.isSaving = false;
			this.errors = [];

			this.errors.push({ severity: 'error', detail: 'Failed to associate location(s).' });
		});
	}

	clearFilter()
	{
		this.filteredLocations = [];
		this.selectedLocations = [];
	}

	keywordSearch(event: any)
	{
		if (this.selectedLocations.length > 0)
		{
			let msgBody = `You are about to start a new search. If you continue you will lose your changes.<br><br> `;
			msgBody += `Do you wish to continue?`;

			let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

			confirm.componentInstance.title = 'Warning!';
			confirm.componentInstance.body = msgBody;
			confirm.componentInstance.defaultOption = 'Cancel';

			confirm.result.then((result) =>
			{
				if (result == 'Continue')
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

	private startSearch(searchFilter: string, keyword: string)
	{
		keyword = keyword || '';

		this.selectedSearchFilter = searchFilter;

		this.filterLocations(searchFilter, keyword);

		this.errors = [];

		if (this.filteredLocations.length === 0)
		{
			this.selectedLocations = [];

			this.errors.push({ severity: 'error', detail: 'No results found.' });
		}
	}

	private filterLocations(filter: string, keyword: string)
	{
		let searchFilter = this.searchFilters.find(f => f.name === filter);

		if (searchFilter)
		{
			this.filteredLocations = [];

			let filteredResults = this.filterByKeyword(searchFilter, keyword);

			this.filteredLocations = unionBy(this.filteredLocations, filteredResults, 'id');
		}
		else
		{
			this.clearFilter();
		}
	}

	private filterByKeyword(searchFilter: any, keyword: string): Array<Location>
	{
		let results = [];

		if (searchFilter.name !== 'All')
		{
			results = this.locationsInMarket.filter(loco => this.searchBar.wildcardMatch(loco[searchFilter.field], keyword));
		}
		else if (searchFilter.name === 'All')
		{
			results = this.locationsInMarket.filter(loco =>
			{
				let fields = this.searchFilters.map(f => f.field);

				return fields.some(f => this.searchBar.wildcardMatch(loco[f], keyword));
			});
		}

		return results;
	}

	isLocationSelected(loco: Location): boolean
	{
		return this.selectedLocations.some(s => s.id === loco.id);
	}

	areAllLocationsSelected(): boolean
	{
		return this.filteredLocations.length > 0 && this.selectedLocations.length === this.filteredLocations.length;
	}

	setLocationSelected(loco: Location, isSelected: boolean): void
	{
		let index = this.selectedLocations.findIndex(s => s.id === loco.id);

		if (isSelected && index < 0)
		{
			this.selectedLocations.push(loco);
		}
		else if (!isSelected && index >= 0)
		{
			this.selectedLocations.splice(index, 1);

			this.selectedLocations = [...this.selectedLocations];
		}
	}

	toggleAllLocations(isSelected: boolean): void
	{
		if (isSelected)
		{
			this.selectedLocations = this.filteredLocations.slice();
		}
		else
		{
			this.selectedLocations = [];
		}
	}
}
