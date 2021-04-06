import { BranchNode, LeafNode } from './base.model';
import { DSubGroup, DivDSubGroup } from './subgroup.model';
import { DivDChoice } from './choice.model';
import { INationalCatalogPointDto } from './national-catalog.model';
import { IDivisionalCatalogPointDto } from './divisional-catalog.model';

export class Point<TDto, TParent, TChildren> extends BranchNode<TDto, TParent, TChildren>
{
    children: Array<TChildren> = [];

    get choices()
    {
        return this.children;
    }

    get subGroup()
    {
        return this.parent;
    }
}

export class DPoint extends LeafNode<INationalCatalogPointDto, DSubGroup>
{
    get id(): number
    {
        return this.dto.dPointCatalogID;
    }
	
    get description(): string
    {
        return this.dto.dPointDescription;
	}

	set description(val: string)
	{
		this.dto.dPointDescription = val;
	}
	    
	get label(): string
	{
		return this.dto.dPointLabel;
	}

	set label(val: string)
	{
		this.dto.dPointLabel = val;
	}

	get sortOrder(): number
	{
		return this.dto.dPointSortOrder;
	}

	set sortOrder(val: number)
	{
		this.dto.dPointSortOrder = val;
	}

	get isFlooring(): boolean
	{
		return this.dto.dPointTypeId != null && this.dto.dPointTypeId === 3;
	}
}

export class DivDPoint extends Point<IDivisionalCatalogPointDto, DivDSubGroup, DivDChoice>
{
	get id(): number
	{
		return this.dto.divDpointCatalogID;
	}
    
    get description(): string
    {
        return this.dto.dPointDescription;
    }
	
    get label(): string
    {
        return this.dto.dPointLabel;
    }

	get sortOrder(): number
	{
		return this.dto.divDPointSortOrder;
	}

	set sortOrder(val: number)
	{
		this.dto.divDPointSortOrder = val;
	}

	get pickTypeLabel(): string
	{
		return this.dto.dPointPickType.dPointPickTypeLabel;
	}
    
	get isQuickQuote(): boolean
	{
		return this.dto.isQuickQuoteItem;
	}

	set isQuickQuote(val: boolean)
	{
		this.dto.isQuickQuoteItem = val;
	}

	get isStructural(): boolean
	{
		return this.dto.isStructuralItem;
	}

	set isStructural(val: boolean)
	{
		this.dto.isStructuralItem = val;
    }

    get hasInactiveChildren(): boolean
    {
        return this.dto.hasInactiveChoices;
    }

    set hasInactiveChildren(inactive: boolean)
    {
        this.dto.hasInactiveChoices = inactive;
	}

	get edhConstructionStageId(): number
	{
		return this.dto.edhConstructionStageId;
	}

	set edhConstructionStageId(id: number)
	{
		this.dto.edhConstructionStageId = id;
	}

	get cutOffDays(): number
	{
		return this.dto.cutOffDays;
	}

	set cutOffDays(days: number)
	{
		this.dto.cutOffDays = days;
	}

	get cutOff(): string
	{
		let cutOffDays = this.cutOffDays;
		let stageId = this.edhConstructionStageId;
		let cutOff: string;

		if (stageId != null)
		{
			cutOff = ConstructionStageTypes[stageId];
		}
		else if (cutOffDays != null)
		{
			let addS = cutOffDays === 1 || cutOffDays === -1 ? '' : 's';

			cutOff = `${cutOffDays} Day${addS}`;
		}

		return cutOff;
	}

	get isFlooring(): boolean
	{
		return this.parent != null && this.parent.isFlooring;
	}
}

export class DivDPointCatalog
{
    divDpointCatalogID?: number;
    orgID?: number;
    dPointCatalogID?: number;
    dPointPickTypeID?: number;
    isActive?: boolean;
    divDPointSortOrder?: number;
    isQuickQuoteItem?: boolean;
	isStructuralItem?: boolean;
	edhConstructionStageId?: number;
	cutOffDays?: number;
	dPointLabel?: string;
	dPointDescription?: string;

    constructor(dto?: IDivCatalogPointDto)
    {
        if (dto)
        {
            this.divDpointCatalogID = dto.divDpointCatalogID;
            this.orgID = dto.orgID == null ? 0 : dto.orgID;
            this.dPointCatalogID = dto.dPointCatalogID;
            this.dPointPickTypeID = dto.dPointPickTypeID == 0 ? null : dto.dPointPickTypeID;
            this.isActive = dto.isActive;
            this.divDPointSortOrder = dto.divDPointSortOrder == null ? 0 : dto.divDPointSortOrder;
            this.isQuickQuoteItem = dto.isQuickQuoteItem == null ? false : dto.isQuickQuoteItem;
			this.isStructuralItem = dto.isStructuralItem == null ? false : dto.isStructuralItem;
			this.edhConstructionStageId = dto.edhConstructionStageId;
			this.cutOffDays = dto.cutOffDays;
			this.dPointLabel = dto.dPointLabel;
			this.dPointDescription = dto.dPointDescription;
        }
    }
}

export interface ICatalogPointDto
{
	dPointCatalogID: number;
	dSubGroupCatalogID: number;
	dPointLabel: string;
	dPointDescription: string;
	dPointSortOrder: number;
	isActive: boolean;
	dPointTypeId?: number;
}

export interface IDivCatalogPointDto extends ICatalogPointDto
{
	divDpointCatalogID: number;
	divDPointSortOrder: number;
	dPointPickTypeID: number;
	dPointPickType: IDPointPickType;
	orgID: number;
	isQuickQuoteItem: boolean;
	isStructuralItem: boolean;
	edhConstructionStageId: number;
	cutOffDays: number;
}

export interface IDPointPickType
{
    dPointPickTypeID: number;
	dPointPickTypeLabel: string;
}

export enum ConstructionStageTypes
{
	Start = 3,
	Frame = 4,
	Second = 5,
	Final = 6
}
