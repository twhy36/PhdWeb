import * as _ from 'lodash';
import { Choice } from 'phd-common';
import { PresalePayload } from '../models/presale-payload.model';
import { Buffer } from 'buffer';

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
		const locations = choice.mappedLocationGroups ? choice.mappedLocationGroups.map(x => x.id) : [];
		const attributes = choice.mappedAttributeGroups ? choice.mappedAttributeGroups.map(x => x.id) : [];

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
			const selectedLocations = selectedAttributes.length > 0 ? selectedAttributes.filter(sa => sa.locationGroupId === lg) : [];

			if (selectedLocations.length)
			{
				// get a distinct list of locationId and locationQuantity.
				const distinctLocations = _.uniqBy(selectedLocations.map(l => { return { locationId: l.locationId, locationQuantity: l.locationQuantity }; }), 'locationId');

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
		const distinctSelectedAttributeIds = selectedAttributes.map(a => a.attributeGroupId).filter((value, index, self) => self.indexOf(value) === index);
		const distinctAttributeIds = attributeGroups.filter((value, index, self) => self.indexOf(value) === index);

		// check attributes to make a value has been selected for each attributeGroup
		allAttrSelected = distinctSelectedAttributeIds.length === distinctAttributeIds.length;
	}

	return allAttrSelected;
}

//take token from querystring and reset session with new token value when resetToken is true
export function setPresaleToken(queryToken: string = '', resetToken = false)
{
	let token = sessionStorage.getItem('presale_token') || queryToken;

	//reset session token with passing queryToken
	if (resetToken)
	{
		if (!queryToken || queryToken === '')
		{
			return;
		}

		token = queryToken;
	}

	if (!!token)
	{
		//do nothing when token is the same in session
		if (sessionStorage.getItem('presale_token') === token)
		{
			return;
		}

		try
		{
			const tokenParts = token.split('.');
			const payload = new PresalePayload(JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('ascii')));

			setSessionItem('presale_token', token);
			setSessionItem('authProvider', 'presale');
			setSessionItem('presale_issuer', payload.iss);
			setSessionItem('presale_plan_community_id', payload.planCommunityId);
		}
		catch (error) 
		{
			throw new Error('Error setting PreSale token: ' + error);
		}
	}
}

//only set the session value when it does not exist or value changes
export function setSessionItem(itemName: string, itemValue)
{
	if (!itemName || itemName === '')
	{
		return;
	}

	if (!sessionStorage.getItem(itemName) || sessionStorage.getItem(itemName) !== itemValue)
	{
		sessionStorage.setItem(itemName, itemValue);
	}
}

export function clearPresaleSessions()
{
	//clear presale session values
	sessionStorage.removeItem('presale_issuer');
	sessionStorage.removeItem('presale_token');
	sessionStorage.removeItem('presale_plan_community_id');

	//only clear presale authProvider
	if (sessionStorage.getItem('authProvider') && sessionStorage.getItem('authProvider') === 'presale')
	{
		sessionStorage.removeItem('authProvider');
	}
}