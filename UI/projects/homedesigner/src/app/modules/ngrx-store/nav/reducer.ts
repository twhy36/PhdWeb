import { NavActions, NavActionTypes } from './actions';

export interface State
{
	selectedSubGroup: number
}

export const initialState: State = { selectedSubGroup: null };

export function reducer(state: State = initialState, action: NavActions): State
{
	switch (action.type)
	{
		case NavActionTypes.SetSelectedSubgroup:
			return { ...state, selectedSubGroup: action.selectedSubGroup };
		default:
			return state;
	}
}
