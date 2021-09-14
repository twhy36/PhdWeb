import { createFeatureSelector } from '@ngrx/store';

import { LiteActions, LiteActionTypes } from './actions';

export interface State
{
	isPhdLite: boolean
}

export const initialState: State = { isPhdLite: false };

export function reducer(state: State = initialState, action: LiteActions): State
{
	switch (action.type)
	{
		case LiteActionTypes.SetIsPhdLite:
			return { ...state, isPhdLite: action.isPhdLite };

		default:
			return state;
	}
}

export const liteState = createFeatureSelector<State>('lite');
