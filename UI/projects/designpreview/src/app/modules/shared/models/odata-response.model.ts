import { OptionCommunityImage } from 'phd-common';

export class ODataResponse<T>
{
	'@odata.context': string;
	'@odata.count'?: number;
	value: T;
}

export class BatchResponse<T>
{
	responses: {
		body: ODataResponse<T>
		headers;
		id: number;
		status: number;
	} [];
}

// Attribute Group Dtos
export interface AttributeGroupDto
{
	description: string;
	groupLabel: string;
	groupName: string;
	id: number;
	isActive: boolean
	attributeGroupAttributeCommunityAssocs: AttributeGroupAttributeCommunityAssocDto[];
	attributeGroupOptionCommunityAssocs: AttributeGroupOptionCommunityAssocDto[];
}

export interface AttributeGroupAttributeCommunityAssocDto
{
	attributeCommunityId: number;
	attributeGroupCommunityId: number;
	attributeCommunity: AttributeCommunityDto;
	attributeGroupCommunity: AttributeGroupCommunityDto;
}

export interface AttributeGroupOptionCommunityAssocDto
{
	attributeGroupCommunityId: number;
	optionCommunity: OptionCommunityDto;
	optionCommunityId: number;
	sortOrder: number;
}

export interface AttributeCommunityDto
{
	attributeDescription: string;
	attributeGroupAttributeCommunityAssocs: AttributeGroupAttributeCommunityAssocDto[];
	attributeMarketId: number;
	createdBy: string;
	createdUtcDate: Date
	endDate: Date
	financialCommunityId: number;
	id: number;
	imageUrl: string;
	lastModifiedBy: string;
	lastModifiedUtcDate: string;
	manufacturer: string;
	name: string;
	sku: string;
	startDate: Date;
}

export interface AttributeDto
{
	id: number;
	imageUrl: string;
	manufacturer: string;
	name: string;
	sku: string
}

export interface AttributeGroupCommunityDto
{
	id: number;
	groupLabel: string;
	groupName: string;
}

// Location Group Dtos
export interface LocationGroupCommunityDto
{
	groupLabel: string;
	id: number;
	isActive: boolean;
	locationGroupDescription: string;
	locationGroupLocationCommunityAssocs: LocationGroupLocationCommunityAssocDto[];
	locationGroupName: string;
}

export interface LocationGroupLocationCommunityAssocDto
{
	locationGroupCommunityId: number;
	locationCommunityId: number;
	locationCommunity: LocationCommunityDto;
}

export interface LocationGroupOptionCommunityAssocDto
{
	locationGroupCommunityId: number;
}

export interface LocationCommunityDto
{
	id: number;
	isActive: boolean;
	locationDescription: string;
	locationName: string;
}

export interface LocationDto
{
	id: number;
	locationName: string;
	locationGroupLocationCommunityAssocs: LocationGroupDto[];
}

export interface LocationGroupDto
{
	locationGroupCommunity: LocationGroupCommunityDto
}

// Option Dtos
export interface OptionCommunityDto
{
	id: number;
	option: OptionDto;
	attributeGroupOptionCommunityAssocs: AttributeGroupOptionCommunityAssocDto[];
	locationGroupOptionCommunityAssocs: LocationGroupOptionCommunityAssocDto[];
	optionCommunityImages: OptionCommunityImage[];
	optionDescription: string;
	optionSalesName: string;
}

export interface OptionDto
{
	id: number;
	financialOptionIntegrationKey: string;
}

export interface PlanOptionCommunityDto
{
	communityId: number;
	id: number;
	isActive: boolean;
	isBaseHouse: boolean;
	isBaseHouseElevation: boolean;
	listPrice: number;
	maxOrderQty: number;
	optionCommunity: OptionCommunityDto;
	planId: number;
}

export interface PlanOptionCommunityImageAssocDto
{
	endDate: Date;
	imageUrl: string;
	planOptionCommunityId: number;
	sortOrder: number;
	startDate: Date;
}

// Tree Dtos
export interface DTreeVersionDto
{
	baseHouseOptions: BaseHouseOptionDto[];
	dTree: DTreeDto;
	dTreeID: number;
	dTreeVersionDescription: string;
	dTreeVersionID: number;
	dTreeVersionName: string;
	lastModifiedDate: Date;
	publishEndDate: Date;
	publishStartDate: Date;
}

export interface DTreeDto
{
	dTreeID: number;
	plan: PlanDto;
	org: OrgDto;
}

export interface OrgDto
{
	edhFinancialCommunityId: number;
}

export interface BaseHouseOptionDto
{
	planOption: PlanOptionDto;
}

export interface PlanOptionDto
{
	integrationKey: string;
	planID: number;
	planOptionID: number;
}

export interface DGroupDto
{
	dGroupCatalog: DGroupCatalogDto;
	dGroupCatalogID: number;
	dGroupID: number;
	dGroupSortOrder: number;
}

export interface DSubGroupDto
{
	dGroup: DGroupDto
	dSubGroupCatalog: DSubGroupCatalogDto;
	dSubGroupCatalogID: number;
	dSubGroupSortOrder: number;
}

export interface DPointDto
{
	dPointID: number;
	dPointSortOrder: number;
	dSubGroup: DSubGroupDto;
	dSubGroupID: number;
	divDPointCatalog: DivDPointCatalogDto;
	divDPointCatalogID: number;
}

export interface DPChoiceDto
{
	dPoint: DPointDto;
	dTreeVersionID: number;
	divChoiceCatalog: DivChoiceCatalogDto;
	divChoiceCatalogID: number;
	dpChoiceID: number;
	dpChoiceSortOrder: number;
	imagePath: string;
	isDecisionDefault: boolean;
	maxQuantity: number;
}

export interface DivChoiceCatalogDto
{
	choiceLabel: string;
}

export interface DivDPointCatalogDto
{
	dPointCatalog: DPointCatalogDto;
	dPointLabel: string;
	isQuickQuoteItem: boolean;
	isStructuralItem: boolean;
}

export interface DPointCatalogDto
{
	dPointTypeId: number;
}

export interface DSubGroupCatalogDto
{
	dSubGroupLabel: string;
}

export interface DGroupCatalogDto
{
	dGroupLabel: string;
}

// Plan Dtos
export interface PlanDto
{
	integrationKey: string;
}

export interface PlanCommunityDto
{
	id: number;
	financialCommunityId: number;
	planSalesName: string;
	planSalesDescription: string;
	productType: string;
	bedrooms: number;
	fullBaths: number;
	halfBaths: number;
	squareFeet: number;
	foundation: string;
	garageConfiguration: string;
	masterBedLocation: string;
	productConfiguration: string;
	financialPlanIntegrationKey: string;
	webSitePlanCommunityAssocs: WebSitePlanCommunityAssocDto[];
}

export interface WebSitePlanCommunityAssocDto
{
	id: number;
	webSitePlanID: number;
	planId: number;
	webSitePlan: WebSitePlanDto;
}

export interface WebSitePlanDto
{
	webSitePlanIntegrationKey: number;
}

// Other Dtos
export interface DPChoiceAttributeGroupCommunityAssocDto
{
	attributeGroupCommunityId: number;
	sortOrder: number;
}

export interface OptionRuleDto
{
	dTreeVersionID: number;
	dpChoice_OptionRuleAssoc: DpChoiceOptionRuleAssocDto[];
	optionRuleID: number;
	optionRuleReplaces: OptionRuleReplaceDto[];
	planOption: PlanOptionDto;
	planOptionID: number;
}

export interface DpChoiceOptionRuleAssocDto
{
	attributeReassignments: AttributeReassignmentDto[]
	dpChoice: DPChoiceDto;
	dpChoiceID: number;
	mustHave: boolean;
}

export interface AttributeReassignmentDto
{
	attributeGroupID: number;
	attributeReassignmentID: number;
	todpChoiceID: number;
}

export interface OptionRuleReplaceDto
{
	planOption: PlanOptionDto;
}
