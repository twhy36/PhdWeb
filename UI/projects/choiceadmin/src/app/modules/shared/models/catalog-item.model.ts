import { DGroup } from './group.model';
import { DSubGroup } from './subgroup.model';
import { DPoint } from './point.model';

export class CatalogItem
{
    itemType: CatalogItemType;
	showDescription: boolean = false;
	item: DGroup | DSubGroup | DPoint;
}

export type CatalogItemType = 'Group' | 'SubGroup' | 'Point' | 'Choice';
