export namespace EdhEntityDto
{
	export interface IPlanOptionDto
	{
		financialOptionIntegrationKey: string;
		salesName: string;
		isActive: boolean;
		listPrice: number;
		maxOrderQty: number;
		categoryName: string;
		subCategoryName: string;
	}
}

export namespace PhdEntityDto
{
	export interface IOrgDto
	{
		orgID?: number;
		integrationKey?: string;
		edhFinancialCommunityId?: number;
		edhMarketId?: number;
	}

	export interface IOrgExpandedDto extends IOrgDto
	{		
		orgLevelID?: number;
		orgName?: string;
		orgStatusID?: number;
		divDPointCatalogs?: Array<IDivDPointCatalogDto>;
		dTrees?: Array<IDTreeDto>;
		orgLevel?: IOrgLevelDto;
		orgStatus?: IOrgStatusDto;
		org1?: Array<IOrgExpandedDto>;  // child orgs
		org2?: IOrgExpandedDto;  // parent org
		plans?: Array<IPlanDto>;
	}

	export interface IOrgLevelDto
	{
		orgLevelID?: number;
		orgLevelName?: string;
		orgs?: Array<IOrgExpandedDto>;
	}

	export interface IOrgStatusDto
	{
		orgStatusID?: number;
		orgStatusName?: string;
		orgs?: Array<IOrgExpandedDto>;
	}

	export interface IDivDPointCatalogDto
	{
		divDpointCatalogID?: number;
		orgID?: number;
		dPointCatalogID?: number;
		dPointPickTypeID?: number;
		isActive?: boolean;
		divDPointSortOrder?: number;
		isQuickQuoteItem?: boolean;
		isStructuralItem?: boolean;
		isHiddenFromBuyerView?: boolean;
		org?: IOrgExpandedDto;
		divChoiceCatalogs?: Array<IDivChoiceCatalogDto>;
		dPointCatalog?: IDPointCatalogDto;
		dPointPickType?: IDPointPickTypeDto;
		dPoints?: Array<IDPointDto>;
		dPointLabel: string;
		dPointDescription: string;
	}

	export interface IDivChoiceCatalogDto
	{
		divChoiceCatalogID?: number;
		divDpointCatalogID?: number;
		choiceLabel?: string;
		isActive?: boolean;
		divChoiceSortOrder?: number;
		isDecisionDefault?: boolean;
		divDPointCatalog?: IDivDPointCatalogDto;
		dPChoices?: Array<IDPChoiceDto>;
	}

	export interface IDGroupCatalogDto
	{
		dGroupCatalogID?: number;
		dGroupLabel?: string;
		dGroupSortOrder?: number;
		dGroupImagePath?: string;
		isActive?: boolean;
		dGroups?: Array<IDGroupDto>;
		dSubGroupCatalogs?: Array<IDSubGroupCatalogDto>;
	}

	export interface IDSubGroupCatalogDto
	{
		dSubGroupCatalogID?: number;
		dGroupCatalogID?: number;
		dSubGroupLabel?: string;
		dSubGroupSortOrder?: number;
		isActive?: boolean;
		dGroupCatalog?: IDGroupCatalogDto;
		dPointCatalogs?: Array<IDPointCatalogDto>;
		dSubGroups?: Array<IDSubGroupDto>;
	}

	export interface IDPointCatalogDto
	{
		dPointCatalogID?: number;
		dSubGroupCatalogID?: number;
		dPointLabel?: string;
		dPointDescription?: string;
		isActive?: boolean;
		dPointSortOrder?: number;
		divDPointCatalogs?: Array<IDivDPointCatalogDto>;
		dSubGroupCatalog?: IDSubGroupCatalogDto;
	}

	export interface IDPointPickTypeDto
	{
		dPointPickTypeID?: number;
		dPointPickTypeLabel?: string;
		dPointPickTypeDescription?: string;
		divDPointCatalogs?: Array<IDivDPointCatalogDto>;
		dPoints?: Array<IDPointDto>;
	}


	export interface IPlanDto
	{
		planID?: number;
		communityID?: number;
		integrationKey?: string;
		org?: IOrgExpandedDto;
		dTrees?: Array<IDTreeDto>;
		// communityLotBlock_PlanAssoc?: Array<CommunityLotBlock_PlanAssoc>;
		planOptions?: Array<IPlanOptionDto>;
	}

	export interface IPlanOptionDto
	{
		planOptionID?: number;
		planID?: number;
		integrationKey?: string;
		plan?: IPlanDto;
		baseHouseOptions?: Array<IBaseHouseOptionDto>;
		optionRules?: Array<IOptionRuleDto>;
		optionRuleReplaces?: Array<IOptionRuleReplaceDto>;
		optionImages?: Array<IOptionImageDto>;
	}

	export interface IDTreeDto
	{
		dTreeID?: number;
		orgID?: number;
		dTreeName?: string;
		planID?: number;
		isActive?: boolean;
		org?: IOrgExpandedDto;
		plan?: IPlanDto;
		dTreeVersions?: Array<IDTreeVersionDto>;
	}

	export interface IDTreeVersionDto
	{
		dTreeVersionID?: number;
		dTreeID?: number;
		dTreeVersionName?: string;
		dTreeVersionDescription?: string;
		lastModifiedDate: string;
		publishStartDate?: string;
		publishEndDate?: string;
		publishedBy?: string;
		houseConfigDetails?: Array<IHouseConfigDetailDto>;
		baseHouseOptions?: Array<IBaseHouseOptionDto>;
		dGroups?: Array<IDGroupDto>;
		dPChoices?: Array<IDPChoiceDto>;
		dpChoice_DPChoiceRuleAssoc?: Array<IDPChoice_DPChoiceRuleAssocDto>;
		dpChoice_OptionRuleAssoc?: Array<IDPChoice_OptionRuleAssocDto>;
		dpChoiceRule_DPChoiceAssoc?: Array<IDPChoiceRule_DPChoiceAssocDto>;
		dPoints?: Array<IDPointDto>;
		dPoint_DPointRuleAssoc?: Array<IDPoint_DPointRuleAssocDto>;
		dPointRuleAssoc_DPChoiceAssoc?: Array<IDPointRuleAssoc_DPChoiceAssocDto>;
		dPointRuleAssoc_DPointAssoc?: Array<IDPointRuleAssoc_DPointAssocDto>;
		dSubGroups?: Array<IDSubGroupDto>;
		dTree?: IDTreeDto;
		optionRules?: Array<IOptionRuleDto>;
		optionRuleReplaces?: Array<IOptionRuleReplaceDto>;
		optionImages?: Array<IOptionImageDto>;
	}

	export interface IHouseConfigDetailDto
	{
		houseConfigDetailID?: number;
		houseConfigID?: number;
		dTreeVersionID?: number;
		houseConfig?: IHouseConfigDto;
		dTreeVersion?: IDTreeVersionDto;
		houseConfigDetailChoices?: Array<IHouseConfigDetailChoiceDto>;
	}

	export interface IHouseConfigDetailChoiceDto
	{
		houseConfigDetailChoiceID?: number;
		houseConfigDetailID?: number;
		dpChoiceID?: number;
		dpChoiceQuantity?: number;
		dpChoiceCalculatedPrice?: number;
		houseConfigDetail?: IHouseConfigDetailDto;
		dPChoice?: IDPChoiceDto;
	}

	export interface IHouseConfigDto
	{
		houseConfigID?: number;
		houseConfigName?: string;
		commLBID?: number;
		opportunityID?: string;
		lotPremiumOverride?: number;
		isLotPremiumOverride?: boolean;
		// communityLotBlock?: ICommunityLotBlockDto;
		houseConfigDetails?: Array<IHouseConfigDetailDto>;
		houseConfigNote?: IHouseConfigNoteDto;
	}

	export interface IHouseConfigNoteDto
	{
		houseConfigID?: number;
		note?: string;
		houseConfig?: IHouseConfigDto;
	}

	export interface IBaseHouseOptionDto
	{
		baseHouseOptionID: number;
		dTreeVersionID: number;
		planOptionID: number;
		planOption: IPlanOptionDto;
		dTreeVersion: IDTreeVersionDto;
	}

	export interface IDGroupDto
	{
		dGroupID?: number;
		dTreeVersionID?: number;
		dGroupCatalogID?: number;
		dGroupSortOrder?: number;
		dGroupCatalog?: IDGroupCatalogDto;
		dSubGroups?: Array<IDSubGroupDto>;
		dTreeVersion?: IDTreeVersionDto;
	}

	export interface IDSubGroupDto
	{
		dSubGroupID?: number;
		dGroupID?: number;
		dTreeVersionID?: number;
		dSubGroupCatalogID?: number;
		dSubGroupSortOrder?: number;
		useInteractiveFloorplan: boolean;
		dGroup?: IDGroupDto;
		dPoints?: Array<IDPointDto>;
		dSubGroupCatalog?: IDSubGroupCatalogDto;
		dTreeVersion?: IDTreeVersionDto;
	}

	export interface IDPointDto
	{
		dPointID?: number;
		dSubGroupID?: number;
		dTreeVersionID?: number;
		divDPointCatalogID?: number;
		dPointPickTypeID?: number;
		dPointSortOrder?: number;
		isQuickQuoteItem?: boolean;
		isStructuralItem?: boolean;
		divDPointCatalog?: IDivDPointCatalogDto;
		dpChoices?: Array<IDPChoiceDto>;
		dPoint_DPointRuleAssoc?: Array<IDPoint_DPointRuleAssocDto>;
		dSubGroup?: IDSubGroupDto;
		dTreeVersion?: IDTreeVersionDto;
		dPointPickType?: IDPointPickTypeDto;
		dPointRuleAssoc_DPointAssoc?: Array<IDPointRuleAssoc_DPointAssocDto>;
	}

	export interface IDPChoiceDto
	{
		dpChoiceID?: number;
		dPointID?: number;
		dTreeVersionID?: number;
		divChoiceCatalogID?: number;
		dpChoiceSortOrder?: number;
		isSelectable?: boolean;
		isDecisionDefault?: boolean;
		imagePath?: string;
		maxQuantity?: number;
		dpChoiceDescription: string;
		houseConfigDetailChoices?: Array<IHouseConfigDetailChoiceDto>;
		divChoiceCatalog?: IDivChoiceCatalogDto;
		dpChoice_DPChoiceRuleAssoc?: Array<IDPChoice_DPChoiceRuleAssocDto>;
		dpChoiceRule_DPChoiceAssoc?: Array<IDPChoiceRule_DPChoiceAssocDto>;
		dPoint?: IDPointDto;
		dTreeVersion?: IDTreeVersionDto;
		dpChoice_OptionRuleAssoc?: Array<IDPChoice_OptionRuleAssocDto>;
		dPointRuleAssoc_DPChoiceAssoc?: Array<IDPointRuleAssoc_DPChoiceAssocDto>;
	}

	export interface IDPChoice_DPChoiceRuleAssocDto
	{
		dpChoiceRuleAssocID?: number;
		dpChoiceRuleID?: number;
		dpChoiceID?: number;
		dTreeVersionID?: number;
		dpChoice?: IDPChoiceDto;
		dTreeVersion?: IDTreeVersionDto;
		dpChoiceRule_DPChoiceAssoc?: Array<IDPChoiceRule_DPChoiceAssocDto>;
		dPChoiceRule?: IDPChoiceRuleDto;
	}

	export interface IDPChoice_OptionRuleAssocDto
	{
		dpChoiceOptionRuleAssocID?: number;
		mustHave?: boolean;
		dpChoiceID?: number;
		dTreeVersionID?: number;
		optionRuleID?: number;
		dpChoice?: IDPChoiceDto;
		dTreeVersion?: IDTreeVersionDto;
		optionRule?: IOptionRuleDto;
	}

	export interface IDPChoiceRule_DPChoiceAssocDto
	{
		dpChoiceRuleAssocID?: number;
		dpChoiceID?: number;
		dTreeVersionID?: number;
		dpChoice?: IDPChoiceDto;
		dpChoice_DPChoiceRuleAssoc?: IDPChoice_DPChoiceRuleAssocDto;
		dTreeVersion?: IDTreeVersionDto;
	}

	export interface IDPChoiceRuleDto
	{
		dpChoiceRuleID?: number;
		dpChoiceRuleLabel?: string;
		dpChoiceRuleDescription?: string;
		dpChoice_DPChoiceRuleAssoc?: Array<IDPChoice_DPChoiceRuleAssocDto>;
	}

	export interface IDPoint_DPointRuleAssocDto
	{
		dPointRuleDPointAssocID?: number;
		dPointRuleID?: number;
		dPointID?: number;
		dTreeVersionID?: number;
		dPoint?: IDPointDto;
		dTreeVersion?: IDTreeVersionDto;
		dPointRuleAssoc_DPChoiceAssoc?: Array<IDPointRuleAssoc_DPChoiceAssocDto>;
		dPointRuleAssoc_DPointAssoc?: Array<IDPointRuleAssoc_DPointAssocDto>;
		dPointRule?: IDPointRuleDto;
	}

	export interface IRuleDto
	{
		id: number;
		parentId: number;
		typeId: number;
		treeVersionId: number;
	}

	export interface IDPointRuleDto extends IRuleDto
	{
		pointRuleId: number;
		pointId: number;
		ruleItems: Array<IRuleItemDto>;
	}

	export interface IRuleItemDto
	{
		id: number;
		itemId: number;
		label: string;
		typeId: number;
		treeVersionId: number;
	}

	export interface IDPointRuleAssoc_DPChoiceAssocDto
	{
		dPointRuleDPointAssocID?: number;
		dpChoiceID?: number;
		dTreeVersionID?: number;
		dpChoice?: IDPChoiceDto;
		dPoint_DPointRuleAssoc?: IDPoint_DPointRuleAssocDto;
		dTreeVersion?: IDTreeVersionDto;
	}

	export interface IDPointRuleAssoc_DPointAssocDto
	{
		dPointRuleDPointAssocID?: number;
		dPointID?: number;
		dTreeVersionID?: number;
		dPoint?: IDPointDto;
		dPoint_DPointRuleAssoc?: IDPoint_DPointRuleAssocDto;
		dTreeVersion?: IDTreeVersionDto;
	}

	export interface IOptionRuleDto
	{
		optionRuleID?: number;
		dTreeVersionID?: number;
		planOptionID?: number;
		planOption?: IPlanOptionDto;
		dpChoice_OptionRuleAssoc?: Array<IDPChoice_OptionRuleAssocDto>;
		dTreeVersion?: IDTreeVersionDto;
		optionRuleReplaces?: Array<IOptionRuleReplaceDto>;
	}

	export interface IOptionRuleReplaceDto
	{
		optionRuleReplaceID?: number;
		dTreeVersionID?: number;
		optionRuleID?: number;
		planOptionID?: number;
		planOption?: IPlanOptionDto;
		dTreeVersion?: IDTreeVersionDto;
		optionRule?: IOptionRuleDto;
	}

	export interface IOptionImageDto
	{
		optionImageId?: number;
		planOptionID?: number;
		dTreeVersionID?: number;
		imageURL?: string;
		sortKey?: number;
		hideImage?: boolean;
		dTreeVersion?: IDTreeVersionDto;
	}

	export interface IAttributeReassignmentDto
	{
		attributeReassignmentID?: number;
		dTreeVersionID?: number;
		toDPChoiceID?: number;
		dpChoiceOptionRuleAssocID?: number;
		attributeGroupID?: number;

		dpChoiceOptionRuleAssoc?: IDPChoice_OptionRuleAssocDto;
		todpChoice?: IDPChoiceDto;
		dTreeVersion?: IDTreeVersionDto;
	}
}

export namespace PhdApiDto
{
	export interface IDTreeDto extends ITreeDto
	{
		treeVersion: IDTreeVersionDto;
	}

	export interface IDTreeVersionDto extends ITreeVersionDto
	{
		groups: Array<IDTreeGroupDto>;
	}

	export interface IDTreeGroupDto extends ITreeGroupDto
	{
		subGroups: Array<IDTreeSubGroupDto>;
	}

	export interface IDTreeSubGroupDto extends ITreeSubGroupDto
	{
		hasUnusedPoints: boolean;
		points: Array<IDTreePointDto>;
	}

	export interface IDTreePointDto extends ITreePointDto
	{
		hasUnusedChoices: boolean;
		hasPointToPointRules: boolean;
		hasPointToChoiceRules: boolean;
		choices: Array<IDTreeChoiceDto>;
	}

	export interface IDTreeChoiceDto extends ITreeChoiceDto
	{
		hasChoiceRules: boolean;
		hasOptionRules: boolean;
		hasAttributes: boolean;
		hasLocations: boolean;
		attributeGroups?: number[];
		locationGroups?: number[];
	}

	export interface IDTPlanOption
	{
		planOptionId: number;
		planId: number;
		optionKey: string;
		hasRules: boolean;
		baseHouse: boolean;
		hasImages: boolean;
		imageCount: number;
	}

	export interface IDTreeRule
	{
		points: Array<IDTreePointDto>;
		integrationKeys: Array<string>;
	}

	export interface ITreeDto
	{
		id: number;
		orgId?: number;
		marketId: number;
		planId?: number;
		planKey: string;
		communityId?: number;
		communityKey: string;
		isActive?: boolean;
		financialCommunityId?: number;
	}

	export interface ITreeVersionDto
	{
		id: number;
		treeId: number;
		planKey: string;
		name: string;
		description: string;
		publishStartDate: string;
		publishEndDate: string;
		lastModifiedDate: string;
		includedOptions: Array<string>;
	}

	export interface ITreeGroupDto
	{
		id: number;
		groupCatalogId: number;
		treeVersionId: number;
		sortOrder: number;
		label: string;
	}

	export interface ITreeSubGroupDto
	{
		id: number;
		treeVersionId: number;
		groupId: number;
		subGroupCatalogId: number;
		sortOrder: number;
		label: string;
		useInteractiveFloorplan: boolean;
		isFloorplanSubgroup: boolean;
	}

	export interface ITreePointDto
	{
		id: number;
		treeVersionId: number;
		subGroupId: number;
		divPointCatalogId: number;
		pointPickTypeId: number;
		pointPickTypeLabel: string;
		sortOrder: number;
		isQuickQuoteItem: boolean;
		isStructuralItem: boolean;
		isHiddenFromBuyerView: boolean;
		label: string;
		description: string;
		edhConstructionStageId?: number;
		cutOffDays?: number;
	}

	export interface ITreeChoiceDto
	{
		id: number;
		treeVersionId: number;
		treePointId: number;
		divChoiceCatalogId: number;
		sortOrder: number;
		isSelectable: boolean;
		isDecisionDefault: boolean;
		label: string;
		description: string;
		imagePath: string;
		hasImage: boolean;
		choiceMaxQuantity?: number;
		isHiddenFromBuyerView?: boolean;
		priceHiddenFromBuyerView?: boolean;
	}

	export interface ITreeIds
	{
		marketId: number;
		communityId: number;
		planId: number;
		versionId: number;
	}

	export interface IOptionChoiceRule
	{
		id: number;
		integrationKey: string;
		planOptionId: number;
		treeVersionId: number;
		choices: Array<IOptionChoiceRuleChoice>;
		replaceRules: Array<IOptionReplace>;
	}

	export interface IOptionChoiceRuleChoice
	{
		id: number;
		treeVersionId: number;
		optionRuleId: number;
		mustHave: boolean;
		choiceId: number;
		label: string;
		pointId: number;
		pointLabel: string;
		//attributeReassignments: IAttributeReassignment[];
	}

	export interface IOptionReplace
	{
		id: number;
		treeVersionId: number;
		optionRuleId: number;
		planOptionId: number;
		label: string;
		optionKey: string;
	}

	export interface IDPointRule extends IRuleDto
	{
		pointRuleId: number;
		pointId: number;
		ruleItems: Array<IRuleItemDto>;
	}

	export interface IDPChoiceRule extends IRuleDto
	{
		choiceRuleId: number;
		choiceId: number;
		ruleItems: Array<IRuleItemDto>;
	}

	export interface IRuleDto
	{
		id: number;
		parentId: number;
		typeId: number;
		treeVersionId: number;
	}

	export interface IRuleItemDto
	{
		id: number;
		itemId: number;
		label: string;
		typeId: number;
		treeVersionId: number;
	}

	export interface IChoiceOptionRule
	{
		optionRuleId: number;
		planOptionId: number;
		choiceOptionRuleId: number;
		label: string;
		integrationKey: string;
	}

	export interface ILocationGroupCommunity
	{
		id: number;
		financialCommunityId: number;
		locationGroupName: string;
		locationGroupDescription: string;
		groupLabel: string;
		isActive: boolean;
		locationGroupCommunityTags: ILocationGroupCommunityTag[];
		locationGroupLocationCommunityAssocs: ILocationGroupLocationCommunityAssocs[];
	}

	export interface ILocationGroupLocationCommunityAssocs
	{
		locationGroupCommunityId: number;
		locationCommunity: ILocationCommunity;
	}

	export interface ILocationGroupCommunityTag
	{
		id: number;
		tag: string;
	}

	export interface ILocationCommunity
	{
		id: number;
		financialCommunityId: number;
		locationName: string;
		locationDescription: string;
		isActive: boolean;
		locationCommunityTags: ILocationCommunityTag[];
	}

	export interface ILocationCommunityTag
	{
		id: number;
		tag: string;
	}

	export interface IAttributeReassignmentDto
	{
		attributeReassignmentId: number;
		treeVersionId: number;
		toChoiceId: number;
		dpChoiceOptionRuleAssocID: number;
		attributeGroupId: number;
	}

	export interface IAttributeReassignment extends IAttributeReassignmentDto
	{
		attributeGroupLabel: string;
		dPointLabel: string;
		choiceLabel: string;
	}
}
