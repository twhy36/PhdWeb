import { PointStatus } from 'phd-common';

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
