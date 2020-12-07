import { Action, createFeatureSelector } from '@ngrx/store';

import { Job } from '../../shared/models/job.model';
import { CommonActionTypes, SalesAgreementLoaded } from '../actions';

export interface State extends Job
{
	jobLoading: boolean;
	loadError: boolean;
}

export const initialState: State = {
	...new Job(), jobLoading: false, loadError: false
};

export function reducer(state: State = initialState, action: Action): State
{
	switch (action.type)
	{
		case CommonActionTypes.SalesAgreementLoaded:
			{
				const saAction = action as SalesAgreementLoaded;
				return { ...state, ...saAction.job, jobLoading: false, loadError: false };
			}

		default:
			return state;
	}
}

export const jobState = createFeatureSelector<State>('job');
