import { RootActionTypes } from '../actions';
import { NavActions, NavActionTypes } from './actions';

export interface State
{
	selectedSubGroup: number,
	selectedPoint: number
}

export const initialState: State = { selectedSubGroup: null, selectedPoint: null };

export function reducer(state: State = initialState, action: NavActions): State
{
	switch (action.type)
	{
		case RootActionTypes.ResetFavorites:
			return { ...state, selectedSubGroup: null, selectedPoint: null };
		case NavActionTypes.SetSelectedSubgroup:
			return { ...state, selectedSubGroup: action.selectedSubGroup, selectedPoint: action.selectedPoint };
		
		default:
			return state;
	}
}
