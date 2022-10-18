import { Action } from '@ngrx/store';

import { ClearLatestError, SetLatestError, PageNotFound } from '../error.action';

export enum AppActionTypes {
	AcknowledgeTermsAndConditions = 'Acknowledge Terms And Conditions',
	CloseTermsAndConditions = 'Close Terms And Conditions',
	ShowTermsAndConditionsModal = 'Show Terms And Conditions Modal'
}

export class AcknowledgeTermsAndConditions implements Action
{
	readonly type = AppActionTypes.AcknowledgeTermsAndConditions;

	constructor() {};
}

export class CloseTermsAndConditions implements Action
{
	readonly type = AppActionTypes.CloseTermsAndConditions;

	constructor() {};
}

export class ShowTermsAndConditionsModal implements Action
{
	readonly type = AppActionTypes.ShowTermsAndConditionsModal;

	constructor(public showTermsAndConditionsModal: boolean) {};
}

export type AppActions = 
	ClearLatestError |
	SetLatestError |
	PageNotFound |
	AcknowledgeTermsAndConditions |
	CloseTermsAndConditions |
	ShowTermsAndConditionsModal;
