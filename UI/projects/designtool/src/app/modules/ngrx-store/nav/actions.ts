import { Action } from '@ngrx/store';
import { PointStatus } from '../../shared/models/point.model';

export enum NavActionTypes {
    SetSubNavItems = 'Set Sub Nav Items',
	SetSelectedSubNavItem = 'Set Selected Subnav Item',
    SetSubNavItemStatus = 'Set Sub Nav Item Status'
}

export class SetSubNavItems implements Action {
    readonly type = NavActionTypes.SetSubNavItems;

    constructor(public items: { label: string, status: PointStatus, id: number }[]) { }
}

export class SetSubNavItemStatus implements Action {
    readonly type = NavActionTypes.SetSubNavItemStatus;

    constructor(public selectedItem: number, public status: PointStatus) { }
}

export class SetSelectedSubNavItem implements Action {
    readonly type = NavActionTypes.SetSelectedSubNavItem;

    constructor(public selectedItem: number) { }
}

export type NavActions =
    SetSubNavItems |
    SetSubNavItemStatus |
	SetSelectedSubNavItem;
