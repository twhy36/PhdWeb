export class MyFavorite
{
	id: number;
    name: string;
    salesAgreementId: number;
    myFavoritesChoice?: MyFavoritesChoice[];

    constructor(dto?: MyFavorite)
    {
		if (dto)
		{
            Object.assign(this, dto);
        }
    }
}

export class MyFavoritesChoice
{
    id: number;
    myFavoriteId: number;
    choiceDescription: string;
    dpChoiceId: number;
    dpChoiceQuantity: number;
    groupLabel: string;
    subGroupLabel: string;
    decisionPointLabel: string;
    sortOrder: number;
    divChoiceCatalogId: number;
    myFavoritesChoiceAttributes?: MyFavoritesChoiceAttribute[];
    myFavoritesChoiceLocations?: MyFavoritesChoiceLocation[];

	constructor(dto?: MyFavoritesChoice)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}    
}

export class MyFavoritesChoiceAttribute
{
    id: number;
    attributeGroupCommunityId: number;
    attributeCommunityId: number;
    attributeName: string;
    attributeGroupLabel: string;
    
	constructor(dto?: MyFavoritesChoiceAttribute)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}    
}


export class MyFavoritesChoiceLocation
{
    id: number;
    locationGroupCommunityId: number;
    locationCommunityId: number;
    locationName: string;
    locationGroupLabel: string;
    quantity: number;
    myFavoritesChoiceLocationAttributes?: MyFavoritesChoiceAttribute[];

	constructor(dto?: MyFavoritesChoiceLocation)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}    
}
