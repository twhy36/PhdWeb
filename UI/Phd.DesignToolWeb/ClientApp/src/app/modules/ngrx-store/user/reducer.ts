import { IMarket } from "../../shared/models/market";
import { UserActions, UserActionTypes } from "./actions";
import { Permission } from "phd-common/models";
import { createFeatureSelector, createSelector } from "@ngrx/store";

export interface State {
	assignedMarkets: IMarket[];
	canConfigure: boolean;
	canSell: boolean;
	canApprove: boolean;
	canOverride: boolean;
	canCancel: boolean;
	canDesign: boolean;
	canAddIncentive: boolean;
	canUpdateECOE: boolean;
	contactId: number;
}

export const initialState: State = { assignedMarkets: [], canApprove: false, canConfigure: false, canSell: false, canOverride: false, canCancel: false, canDesign: false, canAddIncentive: false, contactId: null, canUpdateECOE: false };

export function reducer(state: State = initialState, action: UserActions): State {
	switch (action.type) {
		case UserActionTypes.SetPermissions:
			return {
				assignedMarkets: action.assignedMarkets,
				canConfigure: action.claims.Configuration && !!(action.claims.Configuration & Permission.Edit),
				canSell: action.claims.SalesAgreements && !!(action.claims.SalesAgreements & Permission.Create),
				canApprove: action.claims.SalesAgreements && !!(action.claims.SalesAgreements & Permission.Approve),
				canOverride: action.claims.SalesAgreements && !!(action.claims.SalesAgreements & Permission.Override),
				canCancel: action.claims.SalesAgreements && !!(action.claims.SalesAgreements & Permission.DeleteCancel),
				canDesign: action.claims.JobChangeOrders && !!(action.claims.JobChangeOrders & Permission.Create),
				canAddIncentive: action.claims.Incentives && !!(action.claims.Incentives & Permission.Create),
				canUpdateECOE: action.claims.ECOE && !!(action.claims.ECOE & Permission.Edit),
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
