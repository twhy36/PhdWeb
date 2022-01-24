import { Component, Input } from '@angular/core';

import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';

@Component({
	selector: 'expansion-associated-loc-group-tab-panel',
	templateUrl: './expansion-associated-loc-group-tab-panel.component.html',
	styleUrls: ['./expansion-associated-loc-group-tab-panel.component.scss']
})
export class ExpansionAssociatedLocationGroupTabPanelComponent
{
	@Input() locationGroups: Array<LocationGroupMarket>;
}
