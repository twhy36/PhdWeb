import { ClearLatestError, SetLatestError, PageNotFound } from '../error.action';

export type AppActions = 
	ClearLatestError |
	SetLatestError |
	PageNotFound;
