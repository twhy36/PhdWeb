import { Action } from '@ngrx/store';
import { IMarket, Claims } from 'phd-common';

export enum UserActionTypes
{
	SetPermissions = 'Set Permissions'
}

export class SetPermissions implements Action
{
	readonly type = UserActionTypes.SetPermissions;

	constructor(public claims: Claims, public assignedMarkets: IMarket[], public contactId: number) { }
}

export type UserActions =
	SetPermissions;
