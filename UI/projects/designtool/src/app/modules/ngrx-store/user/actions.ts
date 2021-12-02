import { Action } from '@ngrx/store';
import { IMarket, Claims, Log } from 'phd-common';

export enum UserActionTypes
{
	SetPermissions = 'Set Permissions'
}

@Log(true)
export class SetPermissions implements Action
{
	readonly type = UserActionTypes.SetPermissions;

	constructor(public claims: Claims, public assignedMarkets: IMarket[], public contactId: number) { }
}

export type UserActions =
	SetPermissions;
