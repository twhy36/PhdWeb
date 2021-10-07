export class DivChoiceCatalog  
{
	divChoiceCatalogID?: number;
	divDpointCatalogID?: number;
	choiceLabel?: string;
	isActive?: boolean;
	divChoiceSortOrder?: number;
	isDecisionDefault?: boolean;
	isHiddenFromBuyerView?: boolean;
	priceHiddenFromBuyerView?: boolean;
	mustHave?: boolean;

	constructor(dto?: IDivCatalogChoiceDto)
	{
		if (dto)
		{
			if (dto.divChoiceCatalogID === 0)
			{
				this.choiceLabel = dto.choiceLabel;
				this.divChoiceCatalogID = dto.divChoiceCatalogID;
				this.divChoiceSortOrder = dto.divChoiceSortOrder;
				this.divDpointCatalogID = dto.divDpointCatalogID;
				this.isActive = dto.isActive;
				this.isDecisionDefault = dto.isDecisionDefault;
				this.isHiddenFromBuyerView = dto.isHiddenFromBuyerView;
				this.priceHiddenFromBuyerView = dto.priceHiddenFromBuyerView;
			}
			else
			{
				this.choiceLabel = dto.choiceLabel;
				this.divChoiceCatalogID = dto.divChoiceCatalogID;
				this.isDecisionDefault = dto.isDecisionDefault;
				this.isActive = dto.isActive;
				this.isHiddenFromBuyerView = dto.isHiddenFromBuyerView;
				this.priceHiddenFromBuyerView = dto.priceHiddenFromBuyerView;
			}
		}
	}
}

export interface IDivCatalogChoiceDto
{
	divChoiceCatalogID: number;
	divDpointCatalogID: number;
	dPointCatalogID: number;
	choiceLabel: string;
	divChoiceSortOrder: number;
	isActive: boolean;
	isDecisionDefault: boolean;
	isInUse: boolean;
	isHiddenFromBuyerView: boolean;
	priceHiddenFromBuyerView: boolean;
}