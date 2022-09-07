import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

import { of } from 'rxjs';
import _ from 'lodash';

import { MessageService } from 'primeng/api';

import { LocationService } from '../../../../../core/services/location.service';
import { Location } from '../../../../../shared/models/location.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';

@Component({
	selector: 'expansion-locations-tab-panel',
	templateUrl: './expansion-locations-tab-panel.component.html',
	styleUrls: ['./expansion-locations-tab-panel.component.scss']
})
export class ExpansionLocationsTabPanelComponent implements OnChanges
{
	@Input() group: LocationGroupMarket;
	@Input() locations: Array<Location>;
	@Input() isReadOnly: boolean;
	@Output() onAssociateLocations = new EventEmitter<{ group: LocationGroupMarket, locations: Array<Location>, callback: (loco: Array<Location>) => void }>();

	selectedLocations: Array<Location> = [];
	isSaving: boolean = false;

	get saveDisabled(): boolean
	{
		return this.selectedLocations.length === 0 || this.isSaving;
	}

	constructor(private _msgService: MessageService, private _locoService: LocationService) { }

	ngOnChanges(changes: SimpleChanges): void {
		if (changes.locations) {
			this.locations = _.orderBy(changes.locations.currentValue, [l => l.locationName]);
		}
    }

	onAssociate()
	{
		this._msgService.clear();

		let cb = (loco: Array<Location>) =>
		{
			this.group.locationMarkets$ = of(loco);
		};

		this.onAssociateLocations.emit({ group: this.group, locations: this.locations, callback: cb });
	}

	onRemoveLocations()
	{
		this.isSaving = true;
		let locationIds = this.selectedLocations.map(x => x.id);

		this._locoService.updateLocationAssociations(this.group.id, locationIds, true).subscribe(grp =>
		{
			let locationIds = this.selectedLocations.map(x => x.id);
			let loco = this.locations.filter(loc => !locationIds.some(loc2 => loc2 === loc.id));
			this.group.locationMarkets$ = of(loco);
			this.selectedLocations = [];
			this.isSaving = false;
		},
		error =>
		{
			this.isSaving = false;
			this._msgService.clear();
			this._msgService.add({ severity: 'error', summary: 'Remove Location', detail: `Failed to remove location(s).` });
		});
	}

	isLocationSelected(loco: Location): boolean
	{
		return this.selectedLocations.some(s => s.id === loco.id);
	}

	areAllLocationsSelected(): boolean
	{
		return this.locations.length > 0 && this.selectedLocations.length === this.locations.length;
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
			this.selectedLocations = this.locations.slice();
		}
		else
		{
			this.selectedLocations = [];
		}
	}

	getRowClass(rowData: any): string
	{
		return rowData['isActive'] ? null : 'phd-inactive';
	}
}
