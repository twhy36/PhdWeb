import { Pipe, PipeTransform } from '@angular/core';

import { LocationGroupMarket } from '../../../../../../shared/models/location-group-market.model';
import { AttributeGroupMarket } from '../../../../../../shared/models/attribute-group-market.model';

import { LocationService } from '../../../../../../core/services/location.service';
import { AttributeService } from '../../../../../../core/services/attribute.service';

@Pipe({
	name: 'groupCommunities'
})
export class GroupCommunitiesPipe implements PipeTransform
{
	constructor(private _locationService: LocationService, private _attributeService: AttributeService) { }

	transform(group: LocationGroupMarket | AttributeGroupMarket): any
	{
		let communities: any;
		
		if (group instanceof LocationGroupMarket)
		{
			communities = this._locationService.getFinancialCommunitiesRelatedByLocationGroup(group);
		}
		else if (group instanceof AttributeGroupMarket)
		{
			communities = this._attributeService.getFinancialCommunitiesRelatedByAttributeGroup(group);
		}

		return communities;
	}
}
