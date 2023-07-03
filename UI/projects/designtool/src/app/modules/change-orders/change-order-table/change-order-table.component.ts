import { Component, OnInit, Input, Output, EventEmitter, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { UnsubscribeOnDestroy, convertDateToUtcString } from 'phd-common';

@Component({
	selector: 'change-order-table',
	templateUrl: './change-order-table.component.html',
	styleUrls: ['./change-order-table.component.scss']
})
export class ChangeOrderTableComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() changeOrders: Array<any>;
	@Input() canEdit: boolean;
	@Input() canApprove: boolean;
	@Input() canSell: boolean;
	@Input() canDesign: boolean;
	@Input() canApproveChangeOrder: boolean;
	@Input() contactId: number;
	@Input() isSaving: boolean;

	@Output() onActionSelected = new EventEmitter();
	@Output() onGenerateDocument = new EventEmitter();

	@ViewChild('changeOrderAction') changeOrderAction: ElementRef;

	constructor(private renderer: Renderer2) { super(); }

	ngOnInit()
	{
		if (this.changeOrders.length > 0 && this.changeOrders[0].changeOrderTypeDescription === 'SpecJIO' && isNaN(this.changeOrders[0].index))
		{
			this.changeOrders[0].index = 0;
		}
	}

	resetChangeOrderAction(changeOrderActionTypes)
	{
		this.renderer.setProperty(this.changeOrderAction.nativeElement, 'value', changeOrderActionTypes[0].value);
	}

	onChange(event, changeOrderActionTypes)
	{
		this.resetChangeOrderAction(changeOrderActionTypes);
		this.onActionSelected.emit(event);
	}

	generateDocument(changeOrder: any)
	{
		this.onGenerateDocument.emit(changeOrder);
	}

	canEditChangeOrder(changeOrder: any)
	{
		let canEditRejectedChangeOrder = (changeOrder.salesStatus !== 'Rejected' && changeOrder.constructionStatusDescription !== 'Rejected') || this.changeOrders.length === 1;

		if (!canEditRejectedChangeOrder && this.changeOrders.length > 1)
		{
			canEditRejectedChangeOrder = changeOrder.index === this.changeOrders[this.changeOrders.length - 1].index;
		}

		if (changeOrder.salesStatus === 'Signed')
		{
			return this.canApproveChangeOrder;
		}

		return (changeOrder.salesStatus !== 'Approved' || changeOrder.constructionStatusDescription === 'Rejected')
			&& canEditRejectedChangeOrder
			&& changeOrder.isActiveChangeOrder
			&& (this.canSell || this.canEdit || (this.canDesign && this.contactId === changeOrder.createdByContactId));
	}

	getChangeOrderType(changeOrder: any)
	{
		if (changeOrder)
		{
			switch (changeOrder.changeOrderTypeDescription)
			{
				case 'ChoiceAttribute':
				case 'Elevation':
				case 'Handing':
					if (changeOrder.jobChangeOrderGroupDescription === 'Pulte Home Designer Generated Spec Customer Change Order')
					{
						return 'Spec Customer';
					}
					else if (changeOrder.salesChangeOrderBuyers.length > 0 || changeOrder.salesChangeOrderPriceAdjustments.length > 0
						|| changeOrder.salesChangeOrderSalesPrograms.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0 
						|| changeOrder.salesNotesChangeOrders.length > 0)
					{
						let changeOrderDescription = 'Construction'
						if (changeOrder.salesChangeOrderBuyers.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0)
						{
							changeOrderDescription += '/Buyer Change'
						}
						if (changeOrder.salesChangeOrderPriceAdjustments.length > 0 || changeOrder.salesChangeOrderSalesPrograms.length > 0)
						{
							changeOrderDescription += '/Price Change'
						}
						if (changeOrder.salesNotesChangeOrders.length > 0)
						{
							changeOrderDescription += '/Ts&Cs'
						}
						return changeOrderDescription;
					}
					else
					{
						return 'Construction Change';
					}
				case 'BuyerChangeOrder':
				case 'SalesNotes':
				case 'PriceAdjustment':
					if (changeOrder.jobChangeOrderGroupDescription === 'Pulte Home Designer Generated Spec Customer Change Order')
					{
						return 'Spec Customer';
					}
					else
					{
						let changeOrderDescription = ''
						if (changeOrder.salesChangeOrderBuyers.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0)
						{
							changeOrderDescription += 'Buyer Change';
						}
						if (changeOrder.salesChangeOrderPriceAdjustments.length > 0 || changeOrder.salesChangeOrderSalesPrograms.length > 0)
						{
							changeOrderDescription += changeOrderDescription === '' ? 'Price Change' : '/Price Change';
						}
						if (changeOrder.salesNotesChangeOrders.length > 0)
						{
							changeOrderDescription += changeOrderDescription === '' ? 'Ts&Cs' : '/Ts&Cs'
						}
						return changeOrderDescription;
					}
				case 'HomesiteTransfer':
					if (changeOrder.salesChangeOrderBuyers.length > 0 || changeOrder.salesChangeOrderPriceAdjustments.length > 0
						|| changeOrder.salesChangeOrderSalesPrograms.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0 
						|| changeOrder.salesNotesChangeOrders.length > 0)
					{
						let changeOrderDescription = 'Lot Transfer Change'
						if (changeOrder.salesChangeOrderBuyers.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0)
						{
							changeOrderDescription += '/Buyer Change'
						}
						if (changeOrder.salesChangeOrderPriceAdjustments.length > 0 || changeOrder.salesChangeOrderSalesPrograms.length > 0)
						{
							changeOrderDescription += '/Price Change'
						}
						if (changeOrder.salesNotesChangeOrders.length > 0)
						{
							changeOrderDescription += '/Ts&Cs'
						}
						return changeOrderDescription;
					}
					else
					{
						return 'Lot Transfer Change';
					}
				case 'SalesJIO':
					return changeOrder.changeOrderTypeDescription;
				default:
					if (changeOrder.salesChangeOrderBuyers.length > 0 || changeOrder.salesChangeOrderPriceAdjustments.length > 0
						|| changeOrder.salesChangeOrderSalesPrograms.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0 
						|| changeOrder.salesNotesChangeOrders.length > 0)
					{
						
						let changeOrderDescription = changeOrder.changeOrderTypeDescription
						if (changeOrder.salesChangeOrderBuyers.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0)
						{
							changeOrderDescription += '/Buyer Change'
						}
						if (changeOrder.salesChangeOrderPriceAdjustments.length > 0 || changeOrder.salesChangeOrderSalesPrograms.length > 0)
						{
							changeOrderDescription += '/Price Change'
						}
						if (changeOrder.salesNotesChangeOrders.length > 0)
						{
							changeOrderDescription += '/Ts&Cs'
						}
						return changeOrderDescription;
					}
					else
					{
						return changeOrder.changeOrderTypeDescription;
					}
			}
		}

		return null;
	}

	displaySalesStatusIndicator(changeOrder: any)
	{
		return (changeOrder.eSignStatus === 'completed' && changeOrder.salesStatus !== 'Withdrawn')
			|| (changeOrder.eSignStatus === 'sent' && changeOrder.salesStatus !== 'Withdrawn')
			|| (changeOrder.eSignStatus === 'draft'	&& changeOrder.salesStatus !== 'Signed' 
				&& changeOrder.salesStatus !== 'Withdrawn' && changeOrder.salesStatus !== 'Approved');
	}

	convertDate(date: Date)
	{
		return convertDateToUtcString(date);
	}
}
