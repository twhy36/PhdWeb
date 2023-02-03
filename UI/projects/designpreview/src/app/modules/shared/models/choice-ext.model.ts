import * as _ from 'lodash';

import { Choice, DesignToolAttribute, ChoiceImageAssoc, MyFavoritesChoice } from 'phd-common'

export class ChoiceExt extends Choice
{
	choiceStatus: 'Available' | 'Contracted' | 'ViewOnly';
	isPointStructural: boolean;
	myFavoritesChoice: MyFavoritesChoice;

	constructor(
		dto: Choice,
		status: string,
		myFavoritesChoice: MyFavoritesChoice,
		isPointStructural: boolean)
	{
		super(dto);
		this.choiceStatus = status as 'Available' | 'Contracted' | 'ViewOnly';
		this.isPointStructural = isPointStructural;
		this.myFavoritesChoice = myFavoritesChoice;
	}

	get isFavorite(): boolean
	{
		return !!this.myFavoritesChoice;
	}

	get favoriteAttributes(): DesignToolAttribute[]
	{
		let favoriteAttributes = [];
		if (this.myFavoritesChoice)
		{
			favoriteAttributes = this.myFavoritesChoice.myFavoritesChoiceLocations ? _.flatten(this.myFavoritesChoice.myFavoritesChoiceLocations.map(l =>
			{
				return l.myFavoritesChoiceLocationAttributes && l.myFavoritesChoiceLocationAttributes.length ? l.myFavoritesChoiceLocationAttributes.map(a =>
				{
					return <DesignToolAttribute>{
						attributeId: a.attributeCommunityId,
						attributeGroupId: a.attributeGroupCommunityId,
						scenarioChoiceLocationId: l.id,
						scenarioChoiceLocationAttributeId: a.id,
						locationGroupId: l.locationGroupCommunityId,
						locationId: l.locationCommunityId,
						locationQuantity: l.quantity,
						attributeGroupLabel: a.attributeGroupLabel,
						attributeName: a.attributeName,
						locationGroupLabel: l.locationGroupLabel,
						locationName: l.locationName,
						sku: null,
						manufacturer: null
					};
				}) : [<DesignToolAttribute>{
					locationGroupId: l.locationGroupCommunityId,
					locationGroupLabel: l.locationGroupLabel,
					locationId: l.locationCommunityId,
					locationName: l.locationName,
					locationQuantity: l.quantity
				}];
			})) : [];

			// gets the attributes
			this.myFavoritesChoice.myFavoritesChoiceAttributes && this.myFavoritesChoice.myFavoritesChoiceAttributes.forEach(a =>
			{
				favoriteAttributes.push({
					attributeId: a.attributeCommunityId,
					attributeGroupId: a.attributeGroupCommunityId,
					scenarioChoiceLocationId: a.id,
					attributeGroupLabel: a.attributeGroupLabel,
					attributeName: a.attributeName,
					sku: null,
					manufacturer: null
				} as DesignToolAttribute);
			});
		}

		return favoriteAttributes;
	}

}
