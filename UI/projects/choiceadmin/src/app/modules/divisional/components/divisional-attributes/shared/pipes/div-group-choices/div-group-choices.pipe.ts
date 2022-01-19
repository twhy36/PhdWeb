import { Pipe, PipeTransform } from '@angular/core';

import { LocationGroupMarket } from '../../../../../../shared/models/location-group-market.model';
import { AttributeGroupMarket } from '../../../../../../shared/models/attribute-group-market.model';

import { LocationService } from '../../../../../../core/services/location.service';
import { AttributeService } from '../../../../../../core/services/attribute.service';

@Pipe({
	name: 'groupChoices'
})
export class GroupChoicesPipe implements PipeTransform
{
	constructor(private _locationService: LocationService, private _attributeService: AttributeService) { }

	transform(group: LocationGroupMarket | AttributeGroupMarket): any
	{
		let choices: any;
		
		if (group instanceof LocationGroupMarket)
		{
			choices = this._locationService.getLocationGroupChoices(group);
		}
		else if (group instanceof AttributeGroupMarket)
		{
			choices = this._attributeService.getAttributeGroupChoices(group);
		}
		
		return choices;
	}
}
