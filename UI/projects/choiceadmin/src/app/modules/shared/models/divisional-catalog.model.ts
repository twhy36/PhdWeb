import { IDivCatalogPointDto } from "./point.model";
import { IDivCatalogChoiceDto } from "./choice.model";
import { ICatalogSubGroupDto } from "./subgroup.model";
import { ICatalogGroupDto, DivDGroup } from "./group.model";
import { Observable } from 'rxjs';
import { IFinancialCommunity } from "./financial-community.model";
import { AttributeGroupMarket } from './attribute-group-market.model';
import { LocationGroupMarket } from './location-group-market.model';

export class DivisionalCatalog
{
    groups: Array<DivDGroup>;
}

export class DivisionalChoice
{
	divChoiceCatalogId?: number;
	choiceLabel?: string;
	isActive?: boolean;
	pointLabel?: string;
	subGroupLabel?: string;
	groupLabel?: string;
	imageCount: number = 0;
	hasAttributeLocationAssoc: boolean = false;
	divChoiceCatalogMarketImages$: Observable<DivChoiceCatalogMarketImage[]>;
	divChoiceCatalogMarketImages: DivChoiceCatalogMarketImage[];
	divChoiceCatalogMarketAttributes$: Observable<DivChoiceCatalogAttributeGroupMarket[]>;
	divChoiceCatalogMarketAttributes: DivChoiceCatalogAttributeGroupMarket[];
	divChoiceCatalogMarketLocations$: Observable<DivChoiceCatalogLocationGroupMarket[]>;
	divChoiceCatalogMarketLocations: DivChoiceCatalogLocationGroupMarket[];
	divChoiceCatalogCommunities$: Observable<Array<IFinancialCommunity>>;
}

export class DivChoiceCatalogMarketImage
{
	divChoiceCatalogMarketImageID?: number;
	marketID?: number;
	divChoiceCatalogID?: number;
	imageURL?: string;
	sortKey?: number;

	constructor(dto: IDivChoiceCatalogMarketImageDto)
	{
		this.divChoiceCatalogMarketImageID = dto.divChoiceCatalogMarketImageID;
		this.marketID = dto.marketID;
		this.divChoiceCatalogID = dto.divChoiceCatalogID;
		this.imageURL = dto.imageURL;
		this.sortKey = dto.sortKey;
	}
}

export function isDivChoiceCatalogMarketImage(obj: any): obj is DivChoiceCatalogMarketImage {
	return typeof obj.imageURL !== 'undefined';
}

export class DivChoiceCatalogCommunityImage {
	divChoiceCatalogCommunityImageID?: number;
	divChoiceCatalogMarketImageID?: number;
	communityID?: number;
	divChoiceCatalogID?: number;

	constructor(dto: IDivChoiceCatalogCommunityImageDto) {
		this.divChoiceCatalogCommunityImageID = dto.divChoiceCatalogCommunityImageID;
		this.divChoiceCatalogMarketImageID = dto.divChoiceCatalogMarketImageID;
		this.communityID = dto.communityID;
		this.divChoiceCatalogID = dto.divChoiceCatalogID;
	}
}

export class DivChoiceCatalogAttributeGroupMarket extends AttributeGroupMarket
{
	divChoiceCatalogId: number;
	attributeGroupMarketId: number;

	constructor(dto: IDivChoiceCatalogAttributeGroupMarketDto)
	{
		super();

		this.divChoiceCatalogId = dto.divChoiceCatalogId;
		this.attributeGroupMarketId = dto.attributeGroupMarketId;
	}
}

export function isDivChoiceCatalogAttributeGroupMarket(obj: any): obj is DivChoiceCatalogAttributeGroupMarket
{
	return typeof obj.attributeGroupMarketId !== 'undefined';
}

export class DivChoiceCatalogAttributeGroupCommunity
{
	divChoiceCatalogId: number;
	attributeGroupCommunityId: number;
	attributeGroupMarketId: number;

	constructor(dto: IDivChoiceCatalogAttributeGroupCommunityDto)
	{
		this.divChoiceCatalogId = dto.divChoiceCatalogId;
		this.attributeGroupCommunityId = dto.attributeGroupCommunityId;
		this.attributeGroupMarketId = dto.attributeGroupMarketId;
	}
}

export class DivChoiceCatalogLocationGroupMarket extends LocationGroupMarket
{
	divChoiceCatalogId: number;
	locationGroupMarketId: number;

	constructor(dto: IDivChoiceCatalogLocationGroupMarketDto)
	{
		super();

		this.divChoiceCatalogId = dto.divChoiceCatalogId;
		this.locationGroupMarketId = dto.locationGroupMarketId;
	}
}

export function isDivChoiceCatalogLocationGroupMarket(obj: any): obj is DivChoiceCatalogLocationGroupMarket
{
	return typeof obj.locationGroupMarketId !== 'undefined';
}

export class DivChoiceCatalogLocationGroupCommunity
{
	divChoiceCatalogId: number;
	locationGroupCommunityId: number;
	locationGroupMarketId: number;

	constructor(dto: IDivChoiceCatalogLocationGroupCommunityDto)
	{
		this.divChoiceCatalogId = dto.divChoiceCatalogId;
		this.locationGroupCommunityId = dto.locationGroupCommunityId;
		this.locationGroupMarketId = dto.locationGroupMarketId;
	}
}

export interface IDivisionalCatalogDto
{
    groups: Array<IDivisionalCatalogGroupDto>;
}

export interface IDivisionalCatalogGroupDto extends ICatalogGroupDto
{
    subGroups: Array<IDivisionalCatalogSubGroupDto>;
}

export interface IDivisionalCatalogSubGroupDto extends ICatalogSubGroupDto
{
    hasInactivePoints: boolean;
    points: Array<IDivisionalCatalogPointDto>;
}

export interface IDivisionalCatalogPointDto extends IDivCatalogPointDto
{
    hasInactiveChoices: boolean;
    choices: Array<IDivisionalCatalogChoiceDto>
}

export interface IDivisionalCatalogChoiceDto extends IDivCatalogChoiceDto
{

}

export interface IDivSortList
{
    pointList: Array<IDivCatalogPointDto>;
    choiceList: Array<IDivCatalogChoiceDto>;
}

export interface IDivChoiceCatalogMarketImageDto
{
	divChoiceCatalogMarketImageID?: number;
	marketID?: number;
	divChoiceCatalogID?: number;
	imageURL?: string;
	sortKey?: number;
}

export interface IDivChoiceCatalogCommunityImageDto
{
	divChoiceCatalogCommunityImageID: number;
	divChoiceCatalogMarketImageID?: number;
	communityID: number;
	divChoiceCatalogID?: number;
	imageURL?: string;
	sortKey?: number;	
}

export interface IDivChoiceCatalogAttributeGroupMarketDto
{
	divChoiceCatalogId: number;
	attributeGroupMarketId: number;
}

export interface IDivChoiceCatalogAttributeGroupCommunityDto
{
	divChoiceCatalogId: number;
	attributeGroupCommunityId: number;
	attributeGroupMarketId: number;
}

export interface IDivChoiceCatalogLocationGroupMarketDto
{
	divChoiceCatalogId: number;
	locationGroupMarketId: number;
}

export interface IDivChoiceCatalogLocationGroupCommunityDto
{
	divChoiceCatalogId: number;
	locationGroupCommunityId: number;
	locationGroupMarketId: number;
}
