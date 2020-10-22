import { IDivCatalogPointDto } from "./point.model";
import { IDivCatalogChoiceDto } from "./choice.model";
import { ICatalogSubGroupDto } from "./subgroup.model";
import { ICatalogGroupDto, DivDGroup } from "./group.model";

export class DivisionalCatalog
{
    groups: Array<DivDGroup>;
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
