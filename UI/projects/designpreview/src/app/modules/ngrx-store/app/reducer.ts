import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CommonActionTypes } from '../actions';
import { AppActions, AppActionTypes } from './actions';
import { DesignPreviewError } from '../../shared/models/error.model';

export interface State {
	latestError: DesignPreviewError;
	pageNotFound: boolean;
	showWelcomeModal: boolean;
	welcomeAcknowledged: boolean;
}

export const initialState: State = { latestError: null, pageNotFound: false, showWelcomeModal: true, welcomeAcknowledged: false };

export function reducer(state: State = initialState, action: AppActions): State 
{
	switch (action.type) 
	{
		case CommonActionTypes.ClearLatestError:
			return { ...state, latestError: null, pageNotFound: false };

		case CommonActionTypes.SetLatestError:
			return { ...state, latestError: action.error }

		case CommonActionTypes.PageNotFound:
			return { ...state, pageNotFound: true };

		case AppActionTypes.AcknowledgeWelcome:
			return { ...state, welcomeAcknowledged: action.acknowledgeWelcome }
		
		case AppActionTypes.ShowWelcomeModal:
			return { ...state, showWelcomeModal: action.showWelcomeModal }

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

export const welcomeAcknowledged = createSelector(
	selectApp,
	(app) => 
	{
		return app.welcomeAcknowledged;
	}
);

export const showWelcomeModal = createSelector(
	selectApp,
	(app) => 
	{
		return app.showWelcomeModal;
	}
);
