import { Action } from '@ngrx/store';

import { ClearLatestError, SetLatestError, PageNotFound } from '../error.action';

export enum AppActionTypes {
	AcknowledgeWelcome = 'Acknowledge Welcome',
	ShowWelcomeModal = 'Show Welcome Modal',
}

export class AcknowledgeWelcome implements Action
{
	readonly type = AppActionTypes.AcknowledgeWelcome;

	constructor(public acknowledgeWelcome: boolean) {};
}

export class ShowWelcomeModal implements Action
{
	readonly type = AppActionTypes.ShowWelcomeModal;

	constructor(public showWelcomeModal: boolean) {};
}

export type AppActions = 
	ClearLatestError |
	SetLatestError |
	PageNotFound |
	AcknowledgeWelcome |
	ShowWelcomeModal;
