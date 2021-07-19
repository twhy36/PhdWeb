import { LazyLoadEvent, SortMeta } from 'primeng/api';

export interface TableLazyLoadEvent extends LazyLoadEvent
{

}

/** Table Sort fields used in phd-table / p-table */
export class TableSort
{
	sortField: string;
	sortOrder: number;
	multiSortMeta?: SortMeta[];
	sortOrderText: string;

	constructor(event?: TableLazyLoadEvent)
	{
		if (event)
		{
			this.sortField = event.sortField;
			this.sortOrder = event.sortOrder;
			this.multiSortMeta = event.multiSortMeta;
			this.sortOrderText = event.sortOrder === -1 ? 'desc' : 'asc';
		}
	}
}
