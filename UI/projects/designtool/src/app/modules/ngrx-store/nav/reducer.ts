import { NavActions, NavActionTypes } from './actions';
import { PointStatus } from 'phd-common';

export interface State
{
	subNavItems: { label: string, status: PointStatus, id: number }[],
	selectedItem: number
}

export const initialState: State = { subNavItems: null, selectedItem: null };

export function reducer(state: State = initialState, action: NavActions): State
{
	switch (action.type)
	{
		case NavActionTypes.SetSubNavItems:
			return { ...state, subNavItems: action.items };
		case NavActionTypes.SetSubNavItemStatus:
			let items = state.subNavItems && state.subNavItems.map(item => item.id === action.selectedItem ? { ...item, status: action.status } : item);

			return { ...state, subNavItems: items };
		case NavActionTypes.SetSelectedSubNavItem:
			return { ...state, selectedItem: action.selectedItem };
		default:
			return state;
	}
}
