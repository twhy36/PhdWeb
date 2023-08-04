import { IMarket, Permission } from 'phd-common';
import { UserActions, UserActionTypes } from './actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export interface State
{
	assignedMarkets: IMarket[];
	canConfigure: boolean;
	canSell: boolean;
	canApprove: boolean;
	canOverride: boolean;
	canCancel: boolean;
	canSelectAddenda: boolean;
	canDesign: boolean;
	canCreateChangeOrder: boolean;
	canApproveChangeOrder: boolean;
	canCreateSpecOrModel: boolean;
	canAddIncentive: boolean;
	canUpdateECOE: boolean;
	canLockSalesAgreement: boolean;
	canEditInternalNotes: boolean;
	canCreateDeposits: boolean;
	canDeleteDeposits: boolean;
	contactId: number;
}

export const initialState: State = 
{ 
	assignedMarkets: [], 
	canApprove: false,
	canCreateChangeOrder: false,
	canApproveChangeOrder: false,
	canCreateSpecOrModel: false,
	canConfigure: false, 
	canSell: false, 
	canOverride: false, 
	canCancel: false,
	canSelectAddenda: false,
	canDesign: false, 
	canAddIncentive: false, 
	contactId: null, 
	canUpdateECOE: false, 
	canLockSalesAgreement: false ,
	canEditInternalNotes: false,
	canCreateDeposits: false,
	canDeleteDeposits: false
};

export function reducer(state: State = initialState, action: UserActions): State
{
	switch (action.type)
	{
		case UserActionTypes.SetPermissions:
			return {
				assignedMarkets: action.assignedMarkets,
				canConfigure: action.claims.Configuration && !!(action.claims.Configuration & Permission.Edit),
				canSell: action.claims.SalesAgreements && !!(action.claims.SalesAgreements & Permission.Create),
				canApprove: action.claims.SalesAgreements && !!(action.claims.SalesAgreements & Permission.Approve),
				canOverride: action.claims.SalesAgreements && !!(action.claims.SalesAgreements & Permission.Override),
				canCancel: action.claims.SalesAgreements && !!(action.claims.SalesAgreements & Permission.DeleteCancel),
				canSelectAddenda: action.claims.SalesAgreements && !!(action.claims.SalesAgreements & Permission.Edit),
				canDesign: action.claims.JobChangeOrders && !!(action.claims.JobChangeOrders & Permission.Create),
				canCreateChangeOrder: action.claims.JobChangeOrders && !!(action.claims.JobChangeOrders & Permission.Create),
				canApproveChangeOrder: action.claims.JobChangeOrders && !!(action.claims.JobChangeOrders & Permission.Approve),
				canCreateSpecOrModel: action.claims.SpecOrModel && !!(action.claims.SpecOrModel & Permission.Create),
				canAddIncentive: action.claims.Incentives && !!(action.claims.Incentives & Permission.Create),
				canUpdateECOE: action.claims.ECOE && !!(action.claims.ECOE & Permission.Edit),
				canLockSalesAgreement: action.claims.LockSalesAgreement && !!(action.claims.LockSalesAgreement && Permission.Edit),
				canEditInternalNotes: action.claims.InternalNotes && !!(action.claims.InternalNotes & Permission.Edit),
				canCreateDeposits: action.claims.Deposits && !!(action.claims.Deposits & Permission.Create),
				canDeleteDeposits: action.claims.Deposits && !!(action.claims.Deposits & Permission.DeleteCancel),
				contactId: action.contactId
			};
		default:
			return state;
	}
}

export const selectUser = createFeatureSelector<State>('user');

export const contactId = createSelector(
	selectUser,
	user => user.contactId
);
