import * as _ from 'lodash';
import { Choice } from 'phd-common';

export function isChoiceAttributesComplete(choice: Choice): boolean
{
	let isComplete = true;

	// if mapped attributes or locations attached to the choice has locations and/or attributes but nothing is selected then the choice isn't complete.
	if ((choice.mappedAttributeGroups && choice.mappedAttributeGroups.length > 0 || choice.mappedLocationGroups && choice.mappedLocationGroups.length > 0) && !choice.selectedAttributes.length)
	{
		isComplete = false;
	}
	else
	{
		let locations = choice.mappedLocationGroups ? choice.mappedLocationGroups.map(x => x.id) : [];
		let attributes = choice.mappedAttributeGroups ? choice.mappedAttributeGroups.map(x => x.id) : [];

		isComplete = checkLocationAttributeSelections(choice, locations, attributes);
	}

	return isComplete;
}

function checkLocationAttributeSelections(choice: Choice, locationGroups: number[], attributeGroups: number[])
{
	const selectedAttributes = choice.selectedAttributes;
	const hasLocations = locationGroups && locationGroups.length > 0;
	const hasAttributes = attributeGroups && attributeGroups.length > 0;

	let allAttrSelected = true;

	if (hasLocations)
	{
		locationGroups.forEach(lg =>
		{
			// find all selectedAttributes based on the locationGroup
			let selectedLocations = selectedAttributes.length > 0 ? selectedAttributes.filter(sa => sa.locationGroupId === lg) : [];

			if (selectedLocations.length)
			{
				// get a distinct list of locationId and locationQuantity.
				let distinctLocations = _.uniqBy(selectedLocations.map(l => { return { locationId: l.locationId, locationQuantity: l.locationQuantity }; }), 'locationId');

				if (hasAttributes)
				{
					// for every locationId, make sure it has at least one attribute present
					allAttrSelected = distinctLocations.every(dl => selectedAttributes.filter(sa => sa.attributeId != null && sa.locationId === dl.locationId).length > 0);
				}

				if (allAttrSelected)
				{
					let selectedQty = 0;

					distinctLocations.forEach(l => selectedQty += l.locationQuantity);

					// make sure the selected Quantity matches the choice quantity
					allAttrSelected = choice.quantity === selectedQty;
				}
			}
			else
			{
				allAttrSelected = false;
			}
		});
	}
	else if (hasAttributes)
	{
		let distinctSelectedAttributeIds = selectedAttributes.map(a => a.attributeGroupId).filter((value, index, self) => self.indexOf(value) === index);
		let distinctAttributeIds = attributeGroups.filter((value, index, self) => self.indexOf(value) === index);

		// check attributes to make a value has been selected for each attributeGroup
		allAttrSelected = distinctSelectedAttributeIds.length === distinctAttributeIds.length;
	}

	return allAttrSelected;
}
