import { IDivCatalogPointDto } from "./point.model";
import { IDivCatalogChoiceDto } from "./choice.model";
import { ICatalogSubGroupDto } from "./subgroup.model";
import { ICatalogGroupDto, DivDGroup } from "./group.model";
import { Observable } from 'rxjs';
import { IFinancialCommunity } from "./financial-community.model";

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
	divChoiceCatalogMarketAttributes$: Observable<any[]>;
	divChoiceCatalogMarketLocations$: Observable<any[]>;
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
