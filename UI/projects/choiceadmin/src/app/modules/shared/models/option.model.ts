import { PhdApiDto, PhdEntityDto } from './api-dtos.model';
import { Observable } from 'rxjs';
import { AttributeGroupMarket } from './attribute-group-market.model';
import { LocationGroupMarket } from './location-group-market.model';
import { IFinancialCommunity } from './financial-community.model';

export class Option
{
	id: number;
	optionId: number;
	marketId: number;
	financialCommunityId: number;
	financialOptionIntegrationKey: string;
	optionSalesName: string;
	optionDescription: string;
	category: string;
	subCategory: string;
	attributeGroups$: Observable<Array<AttributeGroupMarket>>;
	attributeGroups: Array<AttributeGroupMarket>;
	locationGroups$: Observable<Array<LocationGroupMarket>>;
	locationGroups: Array<LocationGroupMarket>;
	communities$: Observable<Array<IFinancialCommunity>>;
	hasImages: boolean;
	imageCount: number;
	hasAttributeLocationAssoc: boolean;
}

export class OptionMarket
{
	id: number;
	optionId: number;
	marketId: number;
	isActive: boolean;
	locationGroupOptionMarketAssocs: ILocationGroupOptionMarketAssoc[];
	attributeGroupOptionMarketAssocs: IAttributeGroupOptionMarketAssoc[];
	optionDescription: string;
	optionSalesName: string;
	optionSubCategoryId: number;
}

export interface IAttributeGroupOptionMarketAssoc
{
	optionMarketId: number;
	attributeGroupMarketId: number;
	attributeGroupMarket: AttributeGroupMarket;
	sortOrder: number;
}

export interface ILocationGroupOptionMarketAssoc
{
	optionMarketId: number;
	locationGroupMarketId: number;
	locationGroupMarket: LocationGroupMarket;
}

export interface IOptionMarket extends IOptionMarketDto
{
	option: IOption;
	optionSubCategory: IOptionSubCategory;
}

export interface IOption extends IOptionDto
{

}

export interface IOptionSubCategory extends IOptionSubCategoryDto
{
	optionCategory: IOptionCategory;
}

export interface IOptionCategory extends IOptionCategoryDto
{

}

export interface IOptionMarketDto
{
	id: number;
	optionId: number;
	marketId: number;
	optionSalesName: string;
	optionDescription: string;
	isActive: boolean;
}

export interface IOptionDto
{
	id: number;
	financialOptionIntegrationKey: string;
	isActive: boolean;
}

export interface IOptionSubCategoryDto
{
	id: number;
	name: string;
}

export interface IOptionCategoryDto
{
	id: number;
	name: string;
}

export class SearchOption
{
	matched = false;
	treeOption: ITreeOption;

	constructor(treeOption: ITreeOption)
	{
		this.treeOption = treeOption;
	}

	get optionText()
	{
		return this.treeOption.id + ' ' + this.treeOption.optionHeaderName;
	}

	get baseHouse()
	{
		return this.treeOption.baseHouse;
	}
}

export interface ITreeOptionCategory
{
	label: string;
	subCategories: Array<ITreeOptionSubCategory>;

	matched: boolean;
	open: boolean;
}

export interface ITreeOptionSubCategory
{
	label: string;
	optionItems: Array<SearchOption>;

	matched: boolean;
	open: boolean;
}

export interface ITreeOption
{
	id: string;
	isActive: boolean;
	baseHouse: boolean;
	optionRuleMappingCount: number;
	hasImages: boolean;
	imageCount: number;
	listPrice: number;
	maxOrderQuantity: number;
	categoryName: string;
	subCategoryName: string;
	optionHeaderName: string;
	optionDescription: string;
	matched: boolean;
	optionCommunityId: number;
	hasAttributeLocationAssoc: boolean;	
}

export class TreeOption implements ITreeOption
{
	id = '';
	isActive = false;
	baseHouse = false;
	optionRuleMappingCount = 0;
	hasImages = false;
	imageCount = 0;
	listPrice = 0;
	maxOrderQuantity = 0;
	categoryName = '';
	subCategoryName = '';
	optionHeaderName = '';
	optionDescription = '';
	matched = true;
	optionCommunityId = 0;
	hasAttributeLocationAssoc = false;
	
	constructor(option: IPlanOptionDto, planOption: PhdApiDto.IDTPlanOption)
	{
		if (option == null)
		{
			throw new Error('dto must be specified');
		}

		if (planOption == null)
		{
			throw new Error('plan option must be specified');
		}

		this.id = option.id;
		this.isActive = option.isActive;
		this.baseHouse = planOption.baseHouse;
		this.optionRuleMappingCount = planOption.optionRuleMappingCount;
		this.hasImages = planOption.hasImages;
		this.imageCount = planOption.imageCount;
		this.listPrice = option.listPrice;
		this.maxOrderQuantity = option.maxOrderQuantity;
		this.categoryName = option.category;
		this.subCategoryName = option.subCategory;
		this.optionHeaderName = option.name;
		this.optionDescription = option.description;
		this.optionCommunityId = option.optionCommunityId;
		this.hasAttributeLocationAssoc = option.hasAttributeLocationAssoc;
	}
}

export interface IPlanOptionDto
{
	id: string;
	name: string;
	description: string;
	maxOrderQuantity: number;
	listPrice: number;
	isActive: boolean;
	category: string;
	subCategory: string;
	optionCommunityId: number;
	hasAttributeLocationAssoc: boolean;
}

export class OptionImage
{
	optionImageId: number;
	planOptionID: number;
	dTreeVersionId: number;
	imageUrl: string;
	sortKey: number;
	hideImage: boolean;

	constructor(dto: PhdEntityDto.IOptionImageDto)
	{

		this.optionImageId = dto.optionImageId;
		this.planOptionID = dto.planOptionID;
		this.dTreeVersionId = dto.dTreeVersionID;
		this.imageUrl = dto.imageURL;
		this.sortKey = dto.sortKey;
		this.hideImage = dto.hideImage;
	}
}

export interface IOptionMarketImageDto
{
	id: number;
	optionMarketId: number;
	imageUrl: string;
	sortKey: number;
}

export class OptionMarketImage
{
	id: number;
	optionMarketId: number;
	imageUrl: string;
	sortKey: number;

	constructor(dto: IOptionMarketImageDto)
	{
		this.id = dto.id;
		this.optionMarketId = dto.optionMarketId;
		this.imageUrl = dto.imageUrl;
		this.sortKey = dto.sortKey;
	}
}

export interface IOptionRuleChoice
{
	id: number;
	optionRuleId: number;
	treeVersionId: number;
	mustHave: boolean;
	choiceId: number;
	label: string;
	pointId: number;
	pointLabel: string;
	mappingIndex: number;
}

export interface IOptionRuleChoiceGroup
{
	pointId: number;
	pointLabel: string;
	choices: Array<IOptionRuleChoice>;
}
