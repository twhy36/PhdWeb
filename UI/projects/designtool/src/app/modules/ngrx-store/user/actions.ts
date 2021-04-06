import { Action } from '@ngrx/store';
import { Claims } from 'phd-common/models';
import { IMarket } from '../../shared/models/market';

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
