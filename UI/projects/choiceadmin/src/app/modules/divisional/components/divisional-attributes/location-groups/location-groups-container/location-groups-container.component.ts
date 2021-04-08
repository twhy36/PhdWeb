import { Component, ViewChild } from '@angular/core';

import { startWith } from 'rxjs/operators';

import { DivisionalAttributeTemplateComponent } from '../../divisional-attribute-template/divisional-attribute-template.component';
import { LocationGroupsPanelComponent } from '../location-groups-panel/location-groups-panel.component';
import { AssociateLocationsSidePanelComponent } from '../associate-locations-side-panel/associate-locations-side-panel.component';
import { ActionButton } from '../../../../../shared/models/action-button.model';
import { Location } from '../../../../../shared/models/location.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { LocationService } from '../../../../../core/services/location.service';
import { OrganizationService } from '../../../../../core/services/organization.service';

import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { Permission } from 'phd-common';

@Component({
	selector: 'location-groups-container',
	templateUrl: './location-groups-container.component.html',
	styleUrls: ['./location-groups-container.component.scss']
})
export class LocationGroupsContainerComponent extends UnsubscribeOnDestroy
{
	Permission = Permission;

	@ViewChild(DivisionalAttributeTemplateComponent)
	private divisionAttributeTemplate: DivisionalAttributeTemplateComponent;

	@ViewChild(LocationGroupsPanelComponent)
	locationGroupsPanel: LocationGroupsPanelComponent;

	@ViewChild(AssociateLocationsSidePanelComponent)
	private associatePanel: AssociateLocationsSidePanelComponent;

	sidePanelOpen: boolean = false;
	associateSidePanelOpen: boolean = false;
	actionButtons: Array<ActionButton>;
	locationGroup: LocationGroupMarket;
	marketKey: string = "";

	get existingLocationGroups(): Array<string>
	{
		return (this.locationGroupsPanel && this.locationGroupsPanel.locationGroupsList) ? this.locationGroupsPanel.locationGroupsList.map(loco => loco.locationGroupName) : [];
	}

	constructor(private _locoService: LocationService, private _orgService: OrganizationService, private _divAttrComp: DivisionalAttributesComponent) { super(); }

	ngOnInit()
	{
		this.actionButtons = [
			{ text: 'Add Group', class: 'btn btn-primary', action: this.onAddSingleClicked.bind(this), disabled: false }
		];

		this._orgService.currentFinancialMarket$.pipe(
			this.takeUntilDestroyed(),
			startWith(this._orgService.currentFinancialMarket)
		).subscribe(mkt => this.marketKey = mkt);
	}

	onAddSingleClicked(button: ActionButton)
	{
		this.onSidePanelOpen();
	}

	onSidePanelClose(status: boolean)
	{
		this._divAttrComp.sidePanelOpen = status;
		this.sidePanelOpen = status;

		if (!status)
		{
			this.locationGroup = null;
		}
	}

	onSidePanelOpen(group?: LocationGroupMarket)
	{
		this._divAttrComp.sidePanelOpen = true;
		this.sidePanelOpen = true;

		if (group)
		{
			this.locationGroup = group;
		}
	}

	onAssociateSidePanelClose(status: boolean)
	{
		this.associateSidePanelOpen = status;
	}

	onSaveLocationGroup(locationGroup: LocationGroupMarket)
	{
		if (locationGroup)
		{
			this.locationGroupsPanel.addLocationGroup(locationGroup);
		}
	}

	onAssociateLocations(event: { group: LocationGroupMarket, locations: Array<Location>, callback: any })
	{
		this.associatePanel.group = event.group;
		this.associatePanel.locations = event.locations;
		this.associatePanel.callback = event.callback;
		this.associatePanel.filterAssociatedLocations();
		this.associateSidePanelOpen = true;
	}
}
