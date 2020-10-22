import { Choice } from '../models/tree.model.new';

import * as _ from 'lodash';

export function isChoiceComplete(choice: Choice, isChoiceAttributesRequired: boolean = true): boolean
{
	let isComplete = choice.quantity > 0;

	if (isComplete && isChoiceAttributesRequired)
	{
		isComplete = isChoiceAttributesComplete(choice);
	}

	return isComplete;
}

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
		isComplete = checkLocationAttributeSelections
		(
			choice,
			choice.mappedLocationGroups ? choice.mappedLocationGroups.map(x => x.id) : [],
			choice.mappedAttributeGroups ? choice.mappedAttributeGroups.map(x => x.id) : []
		);
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
					// for every locationId, make sure it has the same number of attributes selected as the number of attributeGroups
					allAttrSelected = distinctLocations.every(dl => selectedAttributes.filter(sa => sa.locationId === dl.locationId && sa.attributeId != null).length === attributeGroups.length);
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
		let distinctAttributeIds = selectedAttributes.map(a => a.attributeGroupId).filter((value, index, self) => self.indexOf(value) === index);

		// check attributes to make a value has been selected for each attributeGroup
		allAttrSelected = distinctAttributeIds.length === attributeGroups.length;
	}

	return allAttrSelected;
}

/**
 * Removes a property from an object.
 * @param obj
 * @param propertyName
 */
export function removeProperty(obj, propertyName)
{
	let { [propertyName]: _, ...result } = obj

	return result
}
