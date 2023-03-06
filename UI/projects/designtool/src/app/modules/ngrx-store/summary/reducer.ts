import { PointStatusFilter } from 'phd-common';
import { SummaryActions, SummaryActionTypes } from './actions';

export interface State
{
	pointStatusFilter: PointStatusFilter;
}

export const initialState: State = {
	pointStatusFilter: new PointStatusFilter()
};

export function reducer(state: State = initialState, action: SummaryActions): State
{
	switch (action.type)
	{
		case SummaryActionTypes.SetPointStatusFilter:
			return { ...state, pointStatusFilter: action.pointStatusFilter };
		default:
			return state;
	}
}
