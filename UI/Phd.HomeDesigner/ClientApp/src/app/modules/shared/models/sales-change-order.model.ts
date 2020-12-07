import { ChangeOrderGroup } from "../../shared/models/job-change-order.model";

import * as _ from 'lodash';

export function isSalesChangeOrder(dto: ChangeOrderGroup): boolean
{
	if (dto)
	{
		const changeOrderTypes = _.flatMap(dto.jobChangeOrders, co => co.jobChangeOrderTypeDescription);
		const nonSalesTypes = changeOrderTypes.filter(x => x !== 'BuyerChangeOrder' && x !== 'PriceAdjustment');

		if (changeOrderTypes.length && !nonSalesTypes.length)
		{
			return true;
		}
	}

	return false;
}
