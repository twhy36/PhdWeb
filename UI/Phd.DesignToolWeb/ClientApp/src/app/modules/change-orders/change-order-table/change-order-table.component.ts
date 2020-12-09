import { Component, OnInit, Input, Output, EventEmitter, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { UnsubscribeOnDestroy } from '../../shared/classes/unsubscribe-on-destroy';
import { convertDateToUtcString } from '../../shared/classes/date-utils.class';

@Component({
	selector: 'change-order-table',
	templateUrl: './change-order-table.component.html',
	styleUrls: ['./change-order-table.component.scss']
})
export class ChangeOrderTableComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() changeOrders: Array<any>;
	@Input() canApprove: boolean;
	@Input() canSell: boolean;
	@Input() canDesign: boolean;
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
		let canEditRejectedChangeOrder = (changeOrder.salesStatus !== 'Rejected' && changeOrder.constructionStatus !== 'Rejected') || this.changeOrders.length === 1;

		if (!canEditRejectedChangeOrder && this.changeOrders.length > 1)
		{
			canEditRejectedChangeOrder = changeOrder.index === this.changeOrders[this.changeOrders.length - 1].index;
		}

		return (changeOrder.salesStatus !== 'Approved' || changeOrder.constructionStatus === 'Rejected')
			&& canEditRejectedChangeOrder
			&& changeOrder.isActiveChangeOrder
			&& (this.canSell || (this.canDesign && this.contactId === changeOrder.createdByContactId));
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
						|| changeOrder.salesChangeOrderSalesPrograms.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0)
					{
						return 'Construction & Sales Change';
					}
					else
					{
						return 'Construction Change';
					}
				case 'BuyerChangeOrder':
				case 'PriceAdjustment':
					if (changeOrder.jobChangeOrderGroupDescription === 'Pulte Home Designer Generated Spec Customer Change Order')
					{
						return 'Spec Customer';
					}
					return 'Sales Change';
				case 'HomesiteTransfer':
					if (changeOrder.salesChangeOrderBuyers.length > 0 || changeOrder.salesChangeOrderPriceAdjustments.length > 0
						|| changeOrder.salesChangeOrderSalesPrograms.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0)
					{
						return 'Lot Transfer & Sales Change';
					}
					else
					{
						return 'Lot Transfer Change';
					}
				case 'SalesJIO':
					return changeOrder.changeOrderTypeDescription;
				default:
					if (changeOrder.salesChangeOrderBuyers.length > 0 || changeOrder.salesChangeOrderPriceAdjustments.length > 0
						|| changeOrder.salesChangeOrderSalesPrograms.length > 0 || changeOrder.salesChangeOrderTrusts.length > 0)
					{
						return changeOrder.changeOrderTypeDescription + ' & Sales Change';
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
			|| (changeOrder.eSignStatus === 'draft' && changeOrder.salesStatus !== 'Out For Signature'
				&& changeOrder.salesStatus !== 'Signed' && changeOrder.salesStatus !== 'Withdrawn'
				&& changeOrder.salesStatus !== 'Approved');
	}

	convertDate(date: Date)
	{
		return convertDateToUtcString(date);
	}
}
