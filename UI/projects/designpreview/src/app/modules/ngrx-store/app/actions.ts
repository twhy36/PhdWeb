import { Action } from '@ngrx/store';

import { ClearLatestError, SetLatestError, PageNotFound } from '../error.action';

export enum AppActionTypes {
	AcknowledgeWelcome = 'Acknowledge Welcome',
	DisableAdobe = 'Disable Adobe',
	ShowWelcomeModal = 'Show Welcome Modal',
}

export class AcknowledgeWelcome implements Action
{
	readonly type = AppActionTypes.AcknowledgeWelcome;

	constructor(public acknowledgeWelcome: boolean) {};
}

export class DisableAdobe implements Action
{
	readonly type = AppActionTypes.DisableAdobe;

	constructor(public disableAdobe: boolean) {};
}

export class ShowWelcomeModal implements Action
{
	readonly type = AppActionTypes.ShowWelcomeModal;

	constructor(public showWelcomeModal: boolean) {};
}

export type AppActions = 
	ClearLatestError |
	DisableAdobe |
	SetLatestError |
	PageNotFound |
	AcknowledgeWelcome |
	ShowWelcomeModal;
