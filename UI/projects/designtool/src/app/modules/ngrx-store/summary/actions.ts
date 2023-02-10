import { Action } from '@ngrx/store';
import { ChangeOrderHanding, Log, PointStatusFilter } from 'phd-common';

export enum SummaryActionTypes
{
	SetPointStatusFilter = 'Set Point Status Filter',
	SetHanding = 'Set Handing'
}

export class SetPointStatusFilter implements Action
{
	readonly type = SummaryActionTypes.SetPointStatusFilter;

	constructor(public pointStatusFilter: PointStatusFilter) { }
}

@Log(true)
export class SetHanding implements Action
{
	readonly type = SummaryActionTypes.SetHanding;

	constructor(public handing: ChangeOrderHanding, public lotId: number) { }
}

export type SummaryActions =
	SetPointStatusFilter |
	SetHanding;
