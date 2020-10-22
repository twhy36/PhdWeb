import { RootNode } from './base.model';
import { DSubGroup, DivDSubGroup } from './subgroup.model';
import { INationalCatalogGroupDto } from '../../shared/models/national-catalog.model';
import { IDivisionalCatalogGroupDto } from '../../shared/models/divisional-catalog.model';

export class Group<TDto, TChildren> extends RootNode<TDto, TChildren>
{
	children: Array<TChildren> = [];
	
	get subGroups()
    {
		return this.children;
	}
}

export class DGroup extends Group<INationalCatalogGroupDto, DSubGroup>
{
    get id(): number
    {
        return this.dto.dGroupCatalogID;
    }

	get label(): string
	{
		return this.dto.dGroupLabel;
	}

	set label(val: string)
	{
		this.dto.dGroupLabel = val;
	}

	get sortOrder(): number
	{
        return this.dto.dGroupSortOrder;
	}

	set sortOrder(val: number)
	{
		this.dto.dGroupSortOrder = val;
	}

	get hasInactiveChildren(): boolean
	{
		return this.dto.hasInactiveSubGroups;
	}

	set hasInactiveChildren(inactive: boolean)
	{
		this.dto.hasInactiveSubGroups = inactive;
	}

	get isFlooring(): boolean
	{
		return this.subGroups != null && this.subGroups.findIndex(x => x.isFlooring) != -1;
	}
}

export class DivDGroup extends Group<IDivisionalCatalogGroupDto, DivDSubGroup>
{
    get id(): number
    {
        return this.dto.dGroupCatalogID;
    }

    get label(): string
    {
        return this.dto.dGroupLabel;
    }

    set label(val: string)
    {
        this.dto.dGroupLabel = val;
    }

    get sortOrder(): number
    {
        return this.dto.dGroupSortOrder;
    }

    set sortOrder(val: number)
    {
        this.dto.dGroupSortOrder = val;
    }
}

export interface ICatalogGroupDto
{
	dGroupCatalogID: number;
	dGroupLabel: string;
	dGroupSortOrder: number;
    isActive: boolean;
    dGroupImagePath: string;
}
