import { LeafNode } from './base.model';
import { DivDPoint } from './point.model';

export class DivDChoice extends LeafNode<IDivCatalogChoiceDto, DivDPoint>
{
	get id(): number
	{
		return this.dto.divChoiceCatalogID;
	}

	get label(): string
	{
		return this.dto.choiceLabel;
	}

	get sortOrder(): number
	{
		return this.dto.divChoiceSortOrder;
	}

	set sortOrder(val: number)
	{
		this.dto.divChoiceSortOrder = val;
	}

	get isDefault(): boolean
	{
		return this.dto.isDecisionDefault;
	}

	set isDefault(val: boolean)
	{
		this.dto.isDecisionDefault = val;
	}

	get isInUse(): boolean
	{
		return this.dto.isInUse;
	}

	set isInUse(val: boolean)
	{
		this.dto.isInUse = val;
	}
}

export class DivChoiceCatalog  
{
    divChoiceCatalogID?: number;
    divDpointCatalogID?: number;
    choiceLabel?: string;
    isActive?: boolean;
    divChoiceSortOrder?: number;
	isDecisionDefault?: boolean;

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
            }
            else
            {
                this.choiceLabel = dto.choiceLabel;
                this.divChoiceCatalogID = dto.divChoiceCatalogID;
                this.isDecisionDefault = dto.isDecisionDefault;
				this.isActive = dto.isActive;
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
}

export interface IChoiceImageAssoc
{
	dpChoiceImageAssocId: number;
	dpChoiceId: number;
	imageUrl: string;
	sortKey: number;
	startDate?: Date;
	endDate?: Date;
	createdBy?: string;
	createdUtcDate?: Date;
	lastModifiedBy?: string;
	lastModifiedUtcDate?: Date;
}
