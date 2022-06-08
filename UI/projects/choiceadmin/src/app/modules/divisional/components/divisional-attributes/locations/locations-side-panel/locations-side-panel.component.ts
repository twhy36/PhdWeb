import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, BehaviorSubject, of, EMPTY as empty, throwError as _throw } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { MessageService } from 'primeng/api';
import { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';

import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';

import { Location } from '../../../../../shared/models/location.model';
import { LocationMarketTag } from '../../../../../shared/models/location-market-tag.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';

import { LocationService } from '../../../../../core/services/location.service';

import { LocationsDetailsTabComponent } from '../locations-details-tab/locations-details-tab.component';
import { LocationsGroupsTabComponent } from '../locations-groups-tab/locations-groups-tab.component';

import { cloneDeep, differenceBy } from "lodash";

@Component({
	selector: 'locations-side-panel',
	templateUrl: './locations-side-panel.component.html',
	styleUrls: ['./locations-side-panel.component.scss']
})
export class LocationsSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@ViewChild(LocationsDetailsTabComponent)
	private detailsTab: LocationsDetailsTabComponent;

	@ViewChild(LocationsGroupsTabComponent)
	private groupsTab: LocationsGroupsTabComponent;

	
	@Input() sidePanelOpen: boolean = false;
	@Input() isAdd: boolean = false;
	@Input() selectedLocation: Location;
	@Input() existingLocations: Array<Location>;
	@Input() activeLocationGroups: Array<LocationGroupMarket>;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Output() onSaveLocation = new EventEmitter<Location>();

	isAddingAnother: boolean = false;
	isSaving: boolean = false;
	isSaving$: BehaviorSubject<boolean>;

	isLocationChanged: boolean = false;
	isGroupSelectionChanged: boolean = false;
	isDetailsFormPristine: boolean = true;

	origSelectedGroups: Array<LocationGroupMarket> = [];
	selectedGroups: Array<LocationGroupMarket> = [];

	searchKeyword: string = '';
	searchFilter: string = '';
	searchSelectedAddGroup: Array<LocationGroupMarket> = [];
	searchSelectedRemoveGroup: Array<LocationGroupMarket> = [];

	get sidePanelHeader(): string
	{
		return this.isAdd ? 'Add Location' : 'Edit Location';
	}

	get saveDisabled(): boolean
	{
		let isGroupChangeValid = (this.selectedLocation ? this.selectedLocation.locationName : false) && this.isGroupSelectionChanged;

		if (this.detailsTab)
		{
			isGroupChangeValid = this.detailsTab.locationForm.valid && this.isGroupSelectionChanged;
		}

		let saveDisabled = (!this.isLocationChanged && !isGroupChangeValid) || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private route: ActivatedRoute, private _locoService: LocationService, private _msgService: MessageService) { }

	ngOnInit()
	{
		this.isSaving$ = new BehaviorSubject<boolean>(this.isSaving);

		if (!this.isAdd && this.selectedLocation)
		{
			this.selectedLocation.locationGroups$.subscribe(groups =>
			{
				this.origSelectedGroups.push(...groups);
				this.selectedGroups.push(...groups);

				if (this.groupsTab)
				{
					this.groupsTab.onGroupSelectionChange();
				}
			});
		}
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	toggleSidePanel()
	{
		if (!this.isDetailsFormPristine || this.isLocationChanged || this.isGroupSelectionChanged)
		{
			this.sidePanel.setIsDirty();
		}

		this.sidePanel.toggleSidePanel();
	}

	save(): Observable<Location>
	{
		this.updateLocationDetails();

		if (!this.selectedLocation.locationName)
		{
			this._msgService.add({ severity: 'error', summary: 'Location', detail: `Location name is required` });

			return empty;
		}

		this.isSaving = true;
		this.isSaving$.next(this.isSaving);

		let location: Observable<Location> = null;

		if (!this.isAdd)
		{
			const locationData = {
				id: this.selectedLocation.id,
				locationName: this.selectedLocation.locationName,
				locationDescription: this.selectedLocation.locationDescription,
				isActive: this.selectedLocation.isActive,
				tags: this.selectedLocation.tags
			} as Location;

			location = this._locoService.patchLocation(locationData);
		}
		else
		{
			location = this._locoService.addLocation(this.selectedLocation);
		}

		return location.pipe(
			switchMap(loco =>
			{
				const addedGroupIds = differenceBy(this.selectedGroups, this.origSelectedGroups, 'id').map(g => g.id);
				const removedGroupIds = differenceBy(this.origSelectedGroups, this.selectedGroups, 'id').map(g => g.id);

				if (addedGroupIds.length || removedGroupIds.length)
				{
					return this._locoService.updateAssociationsByLocationId(loco.id, addedGroupIds, removedGroupIds);
				}
				else
				{
					return of(loco);
				}
			}),
			map(loco =>
			{
				loco.locationMarketTags = this.selectedLocation.tags.map(t =>
				{
					return {
						locationMarketId: loco.id,
						tag: t
					} as LocationMarketTag;
				});

				loco.tags = cloneDeep(this.selectedLocation.tags);

				this.isSaving = false;
				this.isSaving$.next(this.isSaving);

				return loco;
			}),
			catchError(error =>
			{
				return _throw(error || 'Server error');
			}));
	}

	saveAndContinue()
	{
		this.isAddingAnother = true;

		this.save().subscribe(loco =>
		{
			this.onSaveComplete(loco);
		},
			error => this.handleSaveError()
		);
	}

	saveAndClose()
	{
		this.isAddingAnother = false;

		this.save().subscribe(loco =>
		{
			this.onSaveComplete(loco);
			this.sidePanel.isDirty = false;

			this.sidePanel.toggleSidePanel();
		},
			error => this.handleSaveError()
		);
	}

	onSaveComplete(loco: Location)
	{
		this.isLocationChanged = false;
		this.isGroupSelectionChanged = false;
		this.isDetailsFormPristine = true;

		this.onSaveLocation.emit(loco);
		this.handleSaveSuccess();
		this.resetTabs();
	}

	private handleSaveError()
	{
		this.isSaving = false;

		this.isSaving$.next(this.isSaving);

		this._msgService.add({ severity: 'error', summary: 'Location', detail: `failed to saved!` });
	}

	private handleSaveSuccess()
	{
		this._msgService.add({ severity: 'success', summary: 'Location', detail: `has been saved!` });
	}

	async beforeNavChange($event: NgbNavChangeEvent)
	{
		this.updateLocationDetails();

		if ($event.nextId === 'details')
		{
			this.searchKeyword = this.groupsTab.addGroups.searchBar.keyword;
			this.searchFilter = this.groupsTab.addGroups.searchBar.selectedSearchFilter;
			this.searchSelectedAddGroup = this.groupsTab.addGroups.selectedGroups as LocationGroupMarket[];
			this.searchSelectedRemoveGroup = this.groupsTab.removeGroups ? this.groupsTab.removeGroups.selectedGroups as LocationGroupMarket[] : [];
		}
	}

	updateLocationDetails()
	{
		if (this.detailsTab)
		{
			this.selectedLocation = this.detailsTab.getFormData();
		}
	}

	onLocationChanged()
	{
		this.isDetailsFormPristine = this.detailsTab ? this.detailsTab.locationForm.pristine : true;
		this.isLocationChanged = this.detailsTab ? (!this.detailsTab.locationForm.pristine && this.detailsTab.locationForm.valid) : false;
	}

	onGroupSelectionChanged()
	{
		const addedGroups = differenceBy(this.selectedGroups, this.origSelectedGroups, 'id');
		const removedGroups = differenceBy(this.origSelectedGroups, this.selectedGroups, 'id');

		this.isGroupSelectionChanged = (addedGroups != null && !!addedGroups.length) || (removedGroups != null && !!removedGroups.length);
	}

	resetTabs()
	{
		if (this.detailsTab)
		{
			this.detailsTab.reset();
			this.searchKeyword = '';
			this.searchFilter = '';
			this.searchSelectedAddGroup = [];
			this.searchSelectedRemoveGroup = [];
			this.selectedGroups = [];
		}

		if (this.groupsTab)
		{
			this.groupsTab.reset();
			this.selectedLocation = null;
			this.selectedGroups = [];
		}
	}
}
