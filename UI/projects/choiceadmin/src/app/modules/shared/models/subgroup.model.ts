import { BranchNode } from './base.model';
import { DGroup, DivDGroup } from './group.model';
import { DPoint, DivDPoint } from './point.model';
import { INationalCatalogSubGroupDto } from './national-catalog.model';
import { IDivisionalCatalogSubGroupDto } from './divisional-catalog.model';

export class SubGroup<TDto, TParent, TChildren> extends BranchNode<TDto, TParent, TChildren>
{
	children: Array<TChildren> = [];

	get points()
	{
		return this.children;
	}

	get group()
	{
		return this.parent;
	}
}

export class DSubGroup extends SubGroup<INationalCatalogSubGroupDto, DGroup, DPoint>
{
    get id(): number
    {
        return this.dto.dSubGroupCatalogID;
    }

	get label(): string
	{
		return this.dto.dSubGroupLabel;
	}

	set label(val: string)
	{
		this.dto.dSubGroupLabel = val;
	}

	get sortOrder(): number
	{
		return this.dto.dSubGroupSortOrder;
	}

	set sortOrder(val: number)
	{
		this.dto.dSubGroupSortOrder = val;
	}

	get hasInactiveChildren(): boolean
	{
		return this.dto.hasInactivePoints;
	}

	set hasInactiveChildren(inactive: boolean)
	{
		this.dto.hasInactivePoints = inactive;
	}

	get isFlooring(): boolean
	{
		return this.dto.subGroupTypeId === 3;
	}
}

export class DivDSubGroup extends SubGroup<IDivisionalCatalogSubGroupDto, DivDGroup, DivDPoint>
{
    get id(): number
    {
        return this.dto.dSubGroupCatalogID;
    }

    get label(): string
    {
        return this.dto.dSubGroupLabel;
    }

    set label(val: string)
    {
        this.dto.dSubGroupLabel = val;
    }

    get sortOrder(): number
    {
        return this.dto.dSubGroupSortOrder;
    }

    set sortOrder(val: number)
    {
        this.dto.dSubGroupSortOrder = val;
    }

    get hasInactiveChildren(): boolean
    {
        return this.dto.hasInactivePoints;
    }

    set hasInactiveChildren(inactive: boolean)
    {
        this.dto.hasInactivePoints = inactive;
    }

	get isFloorplanSubgroup(): boolean
	{
        return this.dto.isFloorplanSubgroup;
	}

	get isFlooring(): boolean
	{
		return this.dto.subGroupTypeId === 3;
	}
}

export interface ICatalogSubGroupDto
{
	dSubGroupCatalogID: number;
	dGroupCatalogID: number;
	dSubGroupLabel: string;
	dSubGroupSortOrder: number;
    isActive: boolean;
	isFloorplanSubgroup: boolean;
	subGroupTypeId: number;
}
