import { ChangeOrderHanding } from './../../shared/models/job-change-order.model';
import { Action } from '@ngrx/store';
import { PointStatusFilter } from '../../shared/models/decisionPointFilter';

export enum SummaryActionTypes {
	SetPointStatusFilter = 'Set Point Status Filter',
	SetHanding = 'Set Handing'
}

export class SetPointStatusFilter implements Action {
    readonly type = SummaryActionTypes.SetPointStatusFilter;

	constructor(public pointStatusFilter: PointStatusFilter) { }
}

export class SetHanding implements Action {
	readonly type = SummaryActionTypes.SetHanding;

	constructor(public handing: ChangeOrderHanding, public lotId: number) { }
}

export type SummaryActions =
	SetPointStatusFilter |
	SetHanding;
