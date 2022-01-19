import { Pipe, PipeTransform } from '@angular/core';

import { LocationGroupMarket } from '../../../../../../shared/models/location-group-market.model';
import { AttributeGroupMarket } from '../../../../../../shared/models/attribute-group-market.model';

import { LocationService } from '../../../../../../core/services/location.service';
import { AttributeService } from '../../../../../../core/services/attribute.service';

@Pipe({
	name: 'groupOptions'
})
export class GroupOptionsPipe implements PipeTransform
{
	constructor(private _locationService: LocationService, private _attributeService: AttributeService) { }

	transform(group: LocationGroupMarket | AttributeGroupMarket): any
	{
		let options: any;
		
		if (group instanceof LocationGroupMarket)
		{
			options = this._locationService.getLocationGroupOptions(group);
		}
		else if (group instanceof AttributeGroupMarket)
		{
			options = this._attributeService.getAttributeGroupOptions(group);
		}
		
		return options;
	}
}
