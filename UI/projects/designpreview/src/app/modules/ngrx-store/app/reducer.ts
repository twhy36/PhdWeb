import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CommonActionTypes } from '../actions';
import { AppActions } from './actions';



export interface State
{
	latestError: any;
	pageNotFound: boolean;
}

export const initialState: State = { latestError: null, pageNotFound: false };

export function reducer(state: State = initialState, action: AppActions): State
{
	switch (action.type)
	{
		case CommonActionTypes.ClearLatestError:
		{
			return { ...state, latestError: null, pageNotFound: false };		
		}
			
		case CommonActionTypes.SetLatestError:
            let err = { 'stack': action.errorStack, 'friendlyMessage': action.friendlyMessage, 'errFrom': action.occurredFrom, 'errorAt': action.occurredAt };
			return { ...state, latestError: err}
			
		case CommonActionTypes.PageNotFound:
			return {...state, pageNotFound: true };

		default:
			return state;
	}
}

export const selectApp = createFeatureSelector<State>('app');
export const getAppLatestError = createSelector(
	selectApp,
	(app) =>
	{
		return app.latestError;
	}
);

