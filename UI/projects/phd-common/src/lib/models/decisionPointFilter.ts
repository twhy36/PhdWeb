import { PointStatus } from '../models/point.model';

export class PointStatusFilter
{
	statusFilters: PointStatus[];

	constructor()
	{
		this.statusFilters = [];
	}
}

export enum DecisionPointFilterType
{
	FULL,
	QUICKQUOTE,
	STRUCTURAL,
	DESIGN
}
