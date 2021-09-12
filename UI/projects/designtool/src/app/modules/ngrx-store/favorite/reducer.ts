import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as _ from "lodash";

import { MyFavorite } from 'phd-common';

import { CommonActionTypes, SalesAgreementLoaded } from '../actions';
import { FavoriteActions, FavoriteActionTypes } from './actions';

export interface State
{
	myFavorites: MyFavorite[]
}

export const initialState: State = {
	myFavorites: null
};

export function reducer(state: State = initialState, action: FavoriteActions): State
{
	switch (action.type)
	{
		case CommonActionTypes.SalesAgreementLoaded:
			{
				const saAction = action as SalesAgreementLoaded;
				return { ...state, myFavorites: saAction.myFavorites };
			}

		case FavoriteActionTypes.MyFavoritesDeleted:
			{
				return { ...state, myFavorites: null };
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
