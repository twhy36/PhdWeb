import { SummaryActions, SummaryActionTypes } from './actions';
import { PointStatusFilter } from '../../shared/models/decisionPointFilter';

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
