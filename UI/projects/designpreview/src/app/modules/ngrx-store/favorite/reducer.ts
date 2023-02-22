import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as _ from 'lodash';

import { JobChoice, MyFavorite, MyFavoritesChoice } from 'phd-common';

import { CommonActionTypes } from '../actions';
import { FavoriteActions, FavoriteActionTypes } from './actions';


export interface State
{
	myFavorites: MyFavorite[],
	selectedFavoritesId: number,
	isLoading: boolean,
	saveError: boolean,
	salesChoices: JobChoice[],
	includeContractedOptions: boolean
}

export const initialState: State = {
	myFavorites: null,
	selectedFavoritesId: null,
	isLoading: false,
	saveError: false,
	salesChoices: null,
	includeContractedOptions: false
};

export function reducer(state: State = initialState, action: FavoriteActions): State
{
	switch (action.type)
	{
	case CommonActionTypes.SalesAgreementLoaded:
	{
		let includeContractedOptions = state.includeContractedOptions;
		if (action.info?.isDesignComplete)
		{
			includeContractedOptions = true;
		}
		return { ...state, myFavorites: action.myFavorites, salesChoices: action.choices, includeContractedOptions: includeContractedOptions };
	}

	case FavoriteActionTypes.SetCurrentFavorites:
	{
		let includeContractedOptions = state.includeContractedOptions;
		if (!action.favoritesId)
		{
			includeContractedOptions = true;
		}
		return { ...state, selectedFavoritesId: action.favoritesId, includeContractedOptions: includeContractedOptions };
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
		const myFavorites = _.cloneDeep(state.myFavorites);
		if (myFavorites && action.choices && action.choices.length)
		{
			const currentMyFavorite = myFavorites.find(x => x.id === state.selectedFavoritesId);
			if (currentMyFavorite)
			{
				if (!currentMyFavorite.myFavoritesChoice)
				{
					currentMyFavorite.myFavoritesChoice = new Array<MyFavoritesChoice>();
				}

				action.choices.forEach(c =>
				{
					const choiceIndex = currentMyFavorite.myFavoritesChoice.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId);
					if (choiceIndex === -1 && c.id !== 0)
					{
						currentMyFavorite.myFavoritesChoice.push(c);
					}
					else if (choiceIndex > -1)
					{
						if (c.id === 0)
						{
							currentMyFavorite.myFavoritesChoice.splice(choiceIndex, 1);
						}
						else
						{
							currentMyFavorite.myFavoritesChoice[choiceIndex] = c;
						}
					}
				});
			}
		}

		return { ...state, saveError: false, myFavorites: myFavorites };
	}

	case FavoriteActionTypes.MyFavoritesPointDeclinedUpdated:
	{
		const myFavorites = _.cloneDeep(state.myFavorites);

		const myFavorite = myFavorites?.find(x => x.id === action.myFavoritesPointDeclined?.myFavoriteId);
		if (myFavorite)
		{
			const pointDeclinedIndex = myFavorite?.myFavoritesPointDeclined?.findIndex(x => x.divPointCatalogId === action.myFavoritesPointDeclined?.divPointCatalogId || x.id === action.myFavoritesPointDeclined?.id);
			if (action.isDelete && pointDeclinedIndex > -1)
			{
				myFavorite.myFavoritesPointDeclined.splice(pointDeclinedIndex, 1);
			}
			else if (!action.isDelete && pointDeclinedIndex < 0)
			{
				myFavorite.myFavoritesPointDeclined.push(action.myFavoritesPointDeclined);
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
		const myFavorites = _.cloneDeep(state.myFavorites);
		const myFavoriteIndex = myFavorites.findIndex(x => x.id === action.myFavoriteId);
		if (myFavoriteIndex > -1)
		{
			myFavorites.splice(myFavoriteIndex, 1);
		}

		let newSelectedFavoritesId = state.selectedFavoritesId;
		if (state.selectedFavoritesId === action.myFavoriteId)
		{
			newSelectedFavoritesId = null;
		}

		return { ...state, myFavorites: myFavorites, selectedFavoritesId: newSelectedFavoritesId };
	}

	case FavoriteActionTypes.ToggleContractedOptions:
	{
		return { ...state, includeContractedOptions: !state.includeContractedOptions };
	}

	case FavoriteActionTypes.LoadMyFavorite:
	case FavoriteActionTypes.LoadDefaultFavorite:
	{
		return { ...state, isLoading: true };
	}

	case FavoriteActionTypes.MyFavoriteLoaded:
	{
		return { ...state, isLoading: false };
	}

	case FavoriteActionTypes.MyFavoritesChoicesDeleted:
	{
		const myFavorites = _.cloneDeep(state.myFavorites);

		if (myFavorites?.length && action.choices?.length)
		{
			const currentMyFavorite = myFavorites[0];

			action.choices.forEach(c =>
			{
				const choiceIndex = currentMyFavorite.myFavoritesChoice.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId);

				if (choiceIndex > -1)
				{
					currentMyFavorite.myFavoritesChoice.splice(choiceIndex, 1);
				}
			});
		}

		return { ...state, saveError: false, myFavorites: myFavorites };
	}

	case CommonActionTypes.MyFavoritesChoiceAttributesDeleted:
	{
		const myFavorites = _.cloneDeep(state.myFavorites);
		if (myFavorites?.length)
		{
			const currentMyFavorite = myFavorites[0];
			const myFavoritesChoice = currentMyFavorite.myFavoritesChoice.find(c => c.divChoiceCatalogId === action.myFavoritesChoice.divChoiceCatalogId);

			const deletedAttributes = [...action.attributes, ...action.locations];

			deletedAttributes?.forEach(att =>
			{
				if (att.locationId)
				{
					const myFavoritesChoiceLoc = myFavoritesChoice?.myFavoritesChoiceLocations?.find(x =>
						x.locationGroupCommunityId === att.locationGroupId
								&& x.locationCommunityId === att.locationId);

					if (myFavoritesChoiceLoc?.myFavoritesChoiceLocationAttributes?.length)
					{
						const locAttributeIndex = myFavoritesChoiceLoc.myFavoritesChoiceLocationAttributes.findIndex(x =>
							x.attributeGroupCommunityId === att.attributeGroupId
									&& x.attributeCommunityId === att.attributeId);

						if (locAttributeIndex > -1)
						{
							myFavoritesChoiceLoc.myFavoritesChoiceLocationAttributes.splice(locAttributeIndex, 1);
						}
					}
				}
				else
				{
					const attributeIndex = myFavoritesChoice?.myFavoritesChoiceAttributes?.findIndex(x =>
						x.attributeGroupCommunityId === att.attributeGroupId
								&& x.attributeCommunityId === att.attributeId);

					if (attributeIndex > -1)
					{
						myFavoritesChoice.myFavoritesChoiceAttributes.splice(attributeIndex, 1);
					}
				}
			});

			const locationIds = action.locations?.map(loc => loc.locationId);
			const locationGroupIds = action.locations?.map(loc => loc.locationGroupId);

			locationIds?.forEach(locId =>
			{
				const locationIndex = myFavoritesChoice?.myFavoritesChoiceLocations?.findIndex(x =>
					x.locationCommunityId === locId && !!locationGroupIds.find(locGrpId => x.locationGroupCommunityId === locGrpId));

				if (locationIndex > -1)
				{
					myFavoritesChoice.myFavoritesChoiceLocations.splice(locationIndex, 1);
				}
			});
		}

		return { ...state, saveError: false, myFavorites: myFavorites };
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

export const currentMyFavoriteChoices = createSelector(
	favoriteState,
	(state) => state && state.myFavorites ? state.myFavorites?.find(x => x.id === state.selectedFavoritesId)?.myFavoritesChoice : null
);
