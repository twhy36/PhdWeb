import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as _ from "lodash";

import { MyFavorite } from '../../shared/models/my-favorite.model';
import { FavoriteActions, FavoriteActionTypes } from './actions';

export interface State
{
	currentFavorites: MyFavorite
}

export const initialState: State = {
	currentFavorites: null
};

export function reducer(state: State = initialState, action: FavoriteActions): State
{
	switch (action.type)
	{
		case FavoriteActionTypes.SetCurrentFavorites:
			{
				let currentFavorites = _.cloneDeep(state.currentFavorites);
				if (!currentFavorites) {
					currentFavorites = new MyFavorite();
				}
				currentFavorites.name = action.name;

				return { ...state, currentFavorites: currentFavorites };
			}

		default:
			return state;
	}
}

export const favoriteState = createFeatureSelector<State>('favorite');

export const currentFavorites = createSelector(
	favoriteState,
	(state) => state ? state.currentFavorites : null
);
