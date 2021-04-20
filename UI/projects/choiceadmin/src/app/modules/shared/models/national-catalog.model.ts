import { ICatalogSubGroupDto } from "./subgroup.model";
import { ICatalogGroupDto, DGroup } from "./group.model";
import { ICatalogPointDto } from "./point.model";

export class NationalCatalog
{
    hasInactiveGroups: boolean;
    groups: Array<DGroup>;

    get children(): Array<DGroup>
    {
        return this.groups;
    }
}

export interface INationalCatalogDto
{
    hasInactiveGroups: boolean;
    groups: Array<INationalCatalogGroupDto>;
}

export interface INationalCatalogGroupDto extends ICatalogGroupDto
{
    hasInactiveSubGroups: boolean;
    subGroups: Array<INationalCatalogSubGroupDto>;
}

export interface INationalCatalogSubGroupDto extends ICatalogSubGroupDto
{
    hasInactivePoints: boolean;
    points: Array<INationalCatalogPointDto>;
}

export interface INationalCatalogPointDto extends ICatalogPointDto
{

}
