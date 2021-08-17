import { createSelector, createFeatureSelector, Action } from '@ngrx/store';

import { MyFavorite } from 'phd-common';

import { CommonActionTypes, SalesAgreementLoaded } from '../actions';

export interface State
{
	myFavorites: MyFavorite[]
}

export const initialState: State = {
	myFavorites: null
};

export function reducer(state: State = initialState, action: Action): State
{
	switch (action.type)
	{
		case CommonActionTypes.SalesAgreementLoaded:
			{
				const saAction = action as SalesAgreementLoaded;
				return { ...state, myFavorites: saAction.myFavorites };
			}

		default:
			return state;
	}
}

export const favoriteState = createFeatureSelector<State>('favorite');

export const myFavoriteChoices = createSelector(
	favoriteState,
	(state) => !!state?.myFavorites?.length ? state.myFavorites[0].myFavoritesChoice : []
);
