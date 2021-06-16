import { Action, createSelector, createFeatureSelector } from '@ngrx/store';
import * as _ from "lodash";

import { ChangeOrderGroup, isSalesChangeOrder } from 'phd-common';
import { CommonActionTypes } from 'phd-store';
import { SalesAgreementLoaded } from '../actions';

export interface State
{
	isChangingOrder: boolean,
	loadingCurrentChangeOrder: boolean,
	loadError: boolean,
	currentChangeOrder: ChangeOrderGroup,
}

export const initialState: State = {
	isChangingOrder: false,
	loadingCurrentChangeOrder: false,
	loadError: false,
	currentChangeOrder: null
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
					&& (saAction.salesAgreement && ['Pending', 'OutforSignature', 'Signed'].indexOf(saAction.salesAgreement.status) === -1);
				let newCurrentChangeOrder = _.cloneDeep(saAction.changeOrder);

				if (!isSalesChangeOrder(saAction.changeOrder))
				{
					const nonSalesChangeOrders = saAction.changeOrder && saAction.changeOrder.jobChangeOrders
						? saAction.changeOrder.jobChangeOrders.filter(x => x.jobChangeOrderTypeDescription !== 'BuyerChangeOrder' && x.jobChangeOrderTypeDescription !== 'PriceAdjustment')
						: null;

					isPendingChangeOrder = isPendingChangeOrder && nonSalesChangeOrders && nonSalesChangeOrders.length
						&& nonSalesChangeOrders[0].jobChangeOrderTypeDescription !== 'SalesJIO';

				}

				let newChangeOrder = {
					...state,
					currentChangeOrder: newCurrentChangeOrder,
					loadingCurrentChangeOrder: false,
					loadError: false,
					isChangingOrder: isPendingChangeOrder
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
