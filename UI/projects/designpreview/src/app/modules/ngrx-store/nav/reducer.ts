import { CommonActionTypes } from '../actions';
import { NavActions, NavActionTypes } from './actions';

export interface State
{
	selectedSubGroup: number,
	selectedPoint: number,
	selectedChoice: number,
	includedSubGroup: number,
	includedPoint: number
}

export const initialState: State = { selectedSubGroup: null, selectedPoint: null, selectedChoice: null, includedSubGroup: null, includedPoint: null };

export function reducer(state: State = initialState, action: NavActions): State
{
	switch (action.type)
	{
		case CommonActionTypes.ResetFavorites:
			return { ...state, selectedSubGroup: null, selectedPoint: null, selectedChoice: null, includedSubGroup: null, includedPoint: null };
		case NavActionTypes.SetSelectedSubgroup:
			return { ...state, selectedSubGroup: action.selectedSubGroup, selectedPoint: action.selectedPoint, selectedChoice: action.selectedChoice };
		case NavActionTypes.SetIncludedSubgroup:
			return { ...state, includedSubGroup: action.includedSubGroup, includedPoint: action.includedPoint };
		
		default:
			return state;
	}
}
