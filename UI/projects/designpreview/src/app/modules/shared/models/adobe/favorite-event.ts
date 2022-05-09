
export class FavoriteEvent {
    event: string = "Favorite";
    favorite: Favorite = new Favorite;
}

export class Favorite {
    choice: string;
    choiceId: number;
    divChoiceCatalogId: number; 
    price: string;
    decisionPoint: string;
    attribute: string;
    location: string;
    quantity: number;
}

export class FavoriteUpdateEvent {
    event: string = "Favorite Update";
    favorite: Favorite = new Favorite;
}

export class AdobeChoice {
    constructor(dto: any) {
        this.id = dto.id;
        this.dpChoiceId = dto.dpChoiceId;
        this.dpChoiceQuantity = dto.dpChoiceQuantity;
        this.decisionPointLabel = dto.decisionPointLabel;
        this.groupLabel = dto.groupLabel;
        this.divChoiceCatalogId = dto.divChoiceCatalogId;
        this.removed = dto.removed;
        this.attributes = dto.attributes as AdobeAttribute[];
        this.locations = dto.locations as AdobeLocation[];
    }
    id: number;
    dpChoiceId: number;
    dpChoiceQuantity: number;
    decisionPointLabel: string;
    subGroupLabel: string;
    groupLabel: string;
    divChoiceCatalogId: number;
    attributes: AdobeAttribute[];
    locations: AdobeLocation[];
    removed: boolean;
}

export class AdobeAttribute {
    constructor(dto: any) {
        this.id = dto.id;
        this.attributeCommunityId = dto.attributeCommunityId;
        this.attributeGroupCommunityId = dto.attributeGroupCommunityId;
        this.attributeGroupLabel = dto.attributeGroupLabel;
        this.attributeName = dto.groupLabel;
        this.removed = dto.removed;
    }
    attributeCommunityId: number;
    attributeGroupCommunityId: number;
    attributeGroupLabel: string;
    attributeName: string;
    id: number;
    removed: boolean;
}

export class AdobeLocation {
    constructor(dto: any) {
        this.id = dto.id;
        this.locationCommunityId = dto.locationCommunityId;
        this.locationGroupCommunityId = dto.locationGroupCommunityId;
        this.locationGroupLabel = dto.locationGroupLabel;
        this.locationName = dto.locationName;
        this.removed = dto.removed;
        this.quantity = dto.quantity;
        this.attributes = dto.attributes as AdobeAttribute[];
    }
    attributes: AdobeAttribute[] = [];
    id: number;
    locationCommunityId: number;
    locationGroupCommunityId: number;
    locationGroupLabel: string;
    locationName: string;
    quantity: number;
    removed: boolean;
}
