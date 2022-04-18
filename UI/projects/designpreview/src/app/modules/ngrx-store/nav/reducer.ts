import { CommonActionTypes } from '../actions';
import { NavActions, NavActionTypes } from './actions';

export interface State
{
	selectedSubGroup: number,
	selectedPoint: number,
	selectedChoice: number
}

export const initialState: State = { selectedSubGroup: null, selectedPoint: null, selectedChoice: null };

export function reducer(state: State = initialState, action: NavActions): State
{
	switch (action.type)
	{
		case CommonActionTypes.ResetFavorites:
			return { ...state, selectedSubGroup: null, selectedPoint: null, selectedChoice: null };
		case NavActionTypes.SetSelectedSubgroup:
			return { ...state, selectedSubGroup: action.selectedSubGroup, selectedPoint: action.selectedPoint, selectedChoice: action.selectedChoice };
		
		default:
			return state;
	}
}
