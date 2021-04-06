import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { filter, map, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';

import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';
import { DivisionalAttributeTemplateComponent } from '../../divisional-attribute-template/divisional-attribute-template.component';
import { LocationsPanelComponent } from '../locations-panel/locations-panel.component';

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { ActionButton } from '../../../../../shared/models/action-button.model';
import { Location } from '../../../../../shared/models/location.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { LocationService } from '../../../../../core/services/location.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { Permission } from 'phd-common/models';

@Component({
	selector: 'locations-container',
	templateUrl: './locations-container.component.html',
	styleUrls: ['./locations-container.component.scss']
})
export class LocationsContainerComponent extends UnsubscribeOnDestroy implements OnInit
{
	Permission = Permission;

	@ViewChild(DivisionalAttributeTemplateComponent)
	private divisionAttributeTemplate: DivisionalAttributeTemplateComponent;

	@ViewChild(LocationsPanelComponent)
	private locationsPanel: LocationsPanelComponent;

	private selectedLocation: Location;
	private activeLocationGroups: Array<LocationGroupMarket> = [];

	get existingLocations(): Array<Location>
	{
		return (this.locationsPanel && this.locationsPanel.locationsList) ? this.locationsPanel.locationsList : [];
	}

	sidePanelOpen: boolean = false;
	isAddingLocation: boolean = false;
	marketKey: string = "";

	actionButtons: Array<ActionButton>;

	constructor(private route: ActivatedRoute, private _locoService: LocationService, private _divAttrComp: DivisionalAttributesComponent, private _orgService: OrganizationService) { super(); }

	ngOnInit()
	{
		this.actionButtons = [
			{ text: 'Add Location', class: 'btn btn-primary', action: this.onAddSingleClicked.bind(this), disabled: false }
		];

		this.route.parent.paramMap.pipe(
			this.takeUntilDestroyed(),
			filter(p => p.get('marketId') && p.get('marketId') != '0'),
			map(p => +p.get('marketId')),
			distinctUntilChanged(),
			switchMap((marketId: number) => {
				return this._locoService.getActiveLocationGroupsByMarketId(marketId);
			})
		).subscribe(data => {
			this.activeLocationGroups = data;
		});

		this._orgService.currentFinancialMarket$.pipe(
			this.takeUntilDestroyed(),
			startWith(this._orgService.currentFinancialMarket)
		).subscribe(mkt => this.marketKey = mkt);
	}

	onAddSingleClicked(button: ActionButton)
	{
		this.selectedLocation = new Location();
		this.onSidePanelOpen({ event: null, location: this.selectedLocation });
	}

	onSidePanelOpen(params: { event: any, location: Location })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.sidePanelOpen = true;
		this.selectedLocation = params.location;

		this.isAddingLocation = !(params.event && this.selectedLocation.id);
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
		this._divAttrComp.sidePanelOpen = status;

		if (!status) {
			this.selectedLocation = null;
		}
	}

	onSaveLocation(location: Location)
	{
		if (location)
		{
			this.locationsPanel.addLocation(location);
		}
	}

}
