import { Action } from '@ngrx/store';

import { ClearLatestError, SetLatestError, PageNotFound } from '../error.action';

export enum AppActionTypes {
	AcknowledgeTermsAndConditions = 'Acknowledge Terms And Conditions'
}

export class AcknowledgeTermsAndConditions implements Action
{
	readonly type = AppActionTypes.AcknowledgeTermsAndConditions;

	constructor(public acknowledgeTermsAndConditions: boolean) {};
}

export type AppActions = 
	ClearLatestError |
	SetLatestError |
	PageNotFound |
	AcknowledgeTermsAndConditions;
