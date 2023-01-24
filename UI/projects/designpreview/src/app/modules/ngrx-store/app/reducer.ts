import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CommonActionTypes } from '../actions';
import { AppActions, AppActionTypes } from './actions';
import { DesignPreviewError } from '../../shared/models/error.model';

export interface State {
	latestError: DesignPreviewError;
	pageNotFound: boolean;
	showTermsAndConditionsModal: boolean;
	showWelcomeModal: boolean;
	termsAndConditionsAcknowledged: boolean;
}

export const initialState: State = { latestError: null, pageNotFound: false, showTermsAndConditionsModal: false, termsAndConditionsAcknowledged: false, showWelcomeModal: false };

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

	case AppActionTypes.AcknowledgeTermsAndConditions:
		return { ...state, termsAndConditionsAcknowledged: action.acknowledgeTermsAndConditions }
		
	case AppActionTypes.ShowTermsAndConditionsModal:
		return { ...state, showTermsAndConditionsModal: action.showTermsAndConditions }

	case AppActionTypes.ShowWelcomeModal:
		return { ...state, showWelcomeModal: action.showWelcomeMessage }

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
export const termsAndConditionsAcknowledged = createSelector(
	selectApp,
	(app) => 
	{
		return app.termsAndConditionsAcknowledged;
	}
);
export const showTermsAndConditions = createSelector(
	selectApp,
	(app) => 
	{
		return app.showTermsAndConditionsModal;
	}
);
export const showWelcomeMessage = createSelector(
	selectApp,
	(app) => 
	{
		return app.showWelcomeModal;
	}
);

