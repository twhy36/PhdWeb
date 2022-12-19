import { Action } from '@ngrx/store';

import { ClearLatestError, SetLatestError, PageNotFound } from '../error.action';

export enum AppActionTypes {
	AcknowledgeTermsAndConditions = 'Acknowledge Terms And Conditions',
	ShowTermsAndConditionsModal = 'Show Terms and Conditions Modal',
	ShowWelcomeModal = 'Show Welcome Modal'
}

export class AcknowledgeTermsAndConditions implements Action
{
	readonly type = AppActionTypes.AcknowledgeTermsAndConditions;

	constructor(public acknowledgeTermsAndConditions: boolean) {};
}

export class ShowTermsAndConditionsModal implements Action
{
	readonly type = AppActionTypes.ShowTermsAndConditionsModal;

	constructor(public showTermsAndConditions: boolean) {};
}

export class ShowWelcomeModal implements Action
{
	readonly type = AppActionTypes.ShowWelcomeModal;

	constructor(public showWelcomeMessage: boolean) {};
}

export type AppActions = 
	ClearLatestError |
	SetLatestError |
	PageNotFound |
	AcknowledgeTermsAndConditions |
	ShowTermsAndConditionsModal |
	ShowWelcomeModal;
