import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as _ from "lodash";

import { JobChoice } from 'phd-common';

import { MyFavorite, MyFavoritesChoice } from '../../shared/models/my-favorite.model';
import { CommonActionTypes } from '../actions';
import { FavoriteActions, FavoriteActionTypes } from './actions';


export interface State
{
	myFavorites: MyFavorite[],
	selectedFavoritesId: number,
	saveError: boolean,
	salesChoices: JobChoice[]
}

export const initialState: State = {
	myFavorites: null,
	selectedFavoritesId: null,
	saveError: false,
	salesChoices: null
};

export function reducer(state: State = initialState, action: FavoriteActions): State
{
	switch (action.type)
	{
		case CommonActionTypes.SalesAgreementLoaded:
			{
				return { ...state, myFavorites: action.myFavorites, salesChoices: action.choices };
			}	
			
		case FavoriteActionTypes.SetCurrentFavorites:
			{
				return { ...state, selectedFavoritesId: action.favoritesId };
			}
			
		case FavoriteActionTypes.MyFavoriteCreated:
			{
				let myFavorites = _.cloneDeep(state.myFavorites);
				if (!myFavorites)
				{
					myFavorites = new Array<MyFavorite>();
				}
				myFavorites.push(action.myFavorite);

				return { ...state, saveError: false, myFavorites: myFavorites, selectedFavoritesId: action.myFavorite.id };
			}

		case FavoriteActionTypes.MyFavoritesChoicesSaved:
			{
				let myFavorites = _.cloneDeep(state.myFavorites);
				if (myFavorites && action.choices && action.choices.length) 
				{
					let currentMyFavorite = myFavorites.find(x => x.id === state.selectedFavoritesId);
					if (currentMyFavorite)
					{
						if (!currentMyFavorite.myFavoritesChoice)
						{
							currentMyFavorite.myFavoritesChoice = new Array<MyFavoritesChoice>();
						}

						action.choices.forEach(c => {
							let choiceIndex = currentMyFavorite.myFavoritesChoice.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId);
							if (choiceIndex === -1 && c.id > 0)
							{
								currentMyFavorite.myFavoritesChoice.push(c);
							}
							else if (choiceIndex > -1)
							{
								if (c.id === 0)
								{
									currentMyFavorite.myFavoritesChoice.splice(choiceIndex, 1);
								}
								else if (currentMyFavorite.myFavoritesChoice[choiceIndex].id === 0)
								{
									currentMyFavorite.myFavoritesChoice[choiceIndex] = c;
								}
							}
						});
					}
				}

				return { ...state, saveError: false, myFavorites: myFavorites };
			}

		case FavoriteActionTypes.SaveError:
			{
				return { ...state, saveError: true };				
			}

		case FavoriteActionTypes.MyFavoriteDeleted:
			{
				let myFavorites = _.cloneDeep(state.myFavorites);
				const myFavoriteIndex = myFavorites.findIndex(x => x.id === action.myFavoriteId);
				if (myFavoriteIndex > -1)
				{
					myFavorites.splice(myFavoriteIndex);
				}

				let newSelectedFavoritesId = state.selectedFavoritesId;
				if (state.selectedFavoritesId === action.myFavoriteId)
				{
					newSelectedFavoritesId = null;
				}

				return { ...state, myFavorites: myFavorites, selectedFavoritesId: newSelectedFavoritesId };
			}

		default:
			return state;
	}
}

export const favoriteState = createFeatureSelector<State>('favorite');

export const currentMyFavorite = createSelector(
	favoriteState,
	(state) => state && state.myFavorites ? state.myFavorites.find(x => x.id === state.selectedFavoritesId) : null
);
