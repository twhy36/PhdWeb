import { ChangeOrderGroup } from "./job-change-order.model";
import { IBuyer, Buyer } from "./buyer.model";

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

export class SalesChangeOrderPriceAdjustment
{
	id?: number;
	priceAdjustmentTypeName: string;
	amount: number = 0;
	action: string = null;

	constructor(dto: SalesChangeOrderPriceAdjustment = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.amount = dto.amount;
			this.action = dto.action;
			this.priceAdjustmentTypeName = dto.priceAdjustmentTypeName;
		}
	}
}

export class SalesChangeOrderSalesProgram
{
	id?: number;
	salesProgramDescription: string = null;
	salesProgramId: number = 0;
	amount: number = 0;
	action: string = null;
	salesProgramType: string;
	name?: string;

	constructor(dto: SalesChangeOrderSalesProgram = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.salesProgramDescription = dto.salesProgramDescription;
			this.salesProgramId = dto.salesProgramId;
			this.amount = dto.amount;
			this.action = dto.action;

			if (dto.name)
			{
				this.name = dto.name;
			}
			else
			{
				if (dto['salesProgram'] && dto['salesProgram'].name)
				{
					this.name = dto['salesProgram'].name;
				}
			}

			if (dto.salesProgramType)
			{
				this.salesProgramType = dto.salesProgramType;
			}
			else
			{
				if (dto['salesProgram'] && dto['salesProgram'].salesProgramType)
				{
					this.salesProgramType = dto['salesProgram'].salesProgramType;
				}
			}
		}
	}
}

export class ChangeOrderBuyer extends Buyer
{
	action: string;
	buyerName: string;
	firstName: string;
	middleName: string;
	lastName: string;
	suffix: string;

	constructor(dto: IBuyer = null)
	{
		super(dto);
		this.action = dto['action'];
		this.buyerName = dto['buyerName'];
		this.firstName = dto['firstName'];
		this.middleName = dto['middleName'];
		this.lastName = dto['lastName'];
		this.suffix = dto['suffix'];
	}
}

export class SalesChangeOrderTrust
{
	id?: number;
	trustName: string;
	action: string;
	constructor(dto: SalesChangeOrderTrust = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.trustName = dto.trustName;
			this.action = dto.action;
		}
	}
}

export enum SalesChangeOrderTypeEnum
{
	BuyerChangeOrder = 1,
	PriceAdjustment = 2
}

