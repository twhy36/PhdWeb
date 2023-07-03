import { Action, createSelector, createFeatureSelector } from '@ngrx/store';
import * as _ from 'lodash';

import { ChangeOrderGroup, isSalesChangeOrder, Buyer, mergeSalesChangeOrderBuyers, Constants, SalesAgreementStatuses } from 'phd-common';
import { CommonActionTypes, SalesAgreementLoaded } from '../actions';

export interface State
{
	isChangingOrder: boolean,
	loadingCurrentChangeOrder: boolean,
	loadError: boolean,
	currentChangeOrder: ChangeOrderGroup,
	changeOrderBuyers: Array<Buyer>
}

export const initialState: State = {
	isChangingOrder: false,
	loadingCurrentChangeOrder: false,
	loadError: false,
	currentChangeOrder: null,
	changeOrderBuyers: []
};

export function reducer(state: State = initialState, action: Action): State
{
	switch (action.type)
	{
		case CommonActionTypes.SalesAgreementLoaded:
			{
				const saAction = action as SalesAgreementLoaded;
				let isPendingChangeOrder = saAction.changeOrder && saAction.changeOrder.salesStatusDescription === 'Pending'
					// change orders don't apply unless sales agreement is approved
					&& (saAction.salesAgreement &&
						(saAction.salesAgreement.status === SalesAgreementStatuses.Pending || saAction.salesAgreement.status === SalesAgreementStatuses.OutForSignature || saAction.salesAgreement.status === SalesAgreementStatuses.Signed)
					);
				const newCurrentChangeOrder = _.cloneDeep(saAction.changeOrder);

				if (!isSalesChangeOrder(saAction.changeOrder))
				{
					const nonSalesChangeOrders = saAction.changeOrder && saAction.changeOrder.jobChangeOrders
						? saAction.changeOrder.jobChangeOrders.filter(x => x.jobChangeOrderTypeDescription !== 'BuyerChangeOrder' && x.jobChangeOrderTypeDescription !== 'PriceAdjustment')
						: null;

					isPendingChangeOrder = isPendingChangeOrder && nonSalesChangeOrders && nonSalesChangeOrders.length
						&& nonSalesChangeOrders[0].jobChangeOrderTypeDescription !== 'SalesJIO';

				}
				const newBuyers = saAction.salesAgreement.status !== SalesAgreementStatuses.Approved || isPendingChangeOrder ? mergeSalesChangeOrderBuyers(saAction.salesAgreement.buyers, newCurrentChangeOrder) : [];

				const newChangeOrder = {
					...state,
					currentChangeOrder: newCurrentChangeOrder,
					loadingCurrentChangeOrder: false,
					loadError: false,
					isChangingOrder: isPendingChangeOrder,
					changeOrderBuyers: newBuyers,
				};

				return newChangeOrder;
			}

		default:
			return state;
	}
}

//selectors
export const changeOrderState = createFeatureSelector<State>('changeOrder');

export const currentChangeOrder = createSelector(
	changeOrderState,
	(state) => state ? state.currentChangeOrder : null
);

export const changeOrderPrimaryBuyer = createSelector(
	changeOrderState,
	(state) => state && state.changeOrderBuyers ? state.changeOrderBuyers?.find(b => b.isPrimaryBuyer) : null
);
