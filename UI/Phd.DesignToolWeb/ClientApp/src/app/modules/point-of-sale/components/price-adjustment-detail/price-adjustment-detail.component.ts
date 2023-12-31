import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';

import { SalesChangeOrderPriceAdjustment } from '../../../shared/models/sales-change-order.model';
import { ModalService } from '../../../../modules/core/services/modal.service';

@Component({
	selector: 'price-adjustment-detail',
	templateUrl: './price-adjustment-detail.component.html',
	styleUrls: ['./price-adjustment-detail.component.scss'],
})
export class PriceAdjustmentDetailComponent extends ComponentCanNavAway implements OnInit
{
	@Input() editing: any;
	@Input() priceAdjustments: SalesChangeOrderPriceAdjustment[];
	@Input() currentDiscount: number;
	@Input() currentClosingCostIncentive: number;
	@Input() canEdit: boolean;
	@Input() totalCurrentClosingCostAmount: number;

	@Output() onSavingPriceAdjustments = new EventEmitter<Array<SalesChangeOrderPriceAdjustment>>();
	@Output() onDeletePriceAdjustment = new EventEmitter();
	@Output() onEdit = new EventEmitter<SalesChangeOrderPriceAdjustment>();
	@Output() onRemove = new EventEmitter<number>();

	form: FormGroup;
	minClosingCostIncentive: number;

	get discountAmount(): number
	{
		const discount = this.priceAdjustments
			? this.priceAdjustments.find(x => x.priceAdjustmentTypeName === 'Discount')
			: null;

		return discount && discount.amount ? discount.amount : null;
	}

	get closingCostAmount(): number
	{
		const closingCost = this.priceAdjustments
			? this.priceAdjustments.find(x => x.priceAdjustmentTypeName === 'ClosingCost')
			: null;

		return closingCost && closingCost.amount ? closingCost.amount : null;
	}

	get totalDiscountAmount(): number
	{
		if (this.canEdit)
		{
			return this.discountAmount ? this.currentDiscount + this.discountAmount : this.currentDiscount;
		}
		else
		{
			return this.currentDiscount;
		}
	}

	get totalClosingCostAmount(): number
	{
		if (this.canEdit)
		{
			return this.closingCostAmount ? this.currentClosingCostIncentive + this.closingCostAmount : this.currentClosingCostIncentive;
		}
		else
		{
			return this.currentClosingCostIncentive;
		}
	}

	get displayAdjustmentDetail(): boolean
	{
		return !this.editing;
	}

	get displayAdjustmentForm(): boolean
	{
		return this.priceAdjustments && this.priceAdjustments.length && this.editing === this.priceAdjustments[0];
	}

	constructor(private modalService: ModalService)
	{ super(); }

	ngOnInit()
	{
		this.createForm();
	}

	createForm()
	{
		this.minClosingCostIncentive = this.totalCurrentClosingCostAmount > 0 ? -Math.abs(this.totalCurrentClosingCostAmount) : 0;
		this.form = new FormGroup({
			'discount': new FormControl(this.discountAmount ? this.discountAmount.toString() : null),
			'buyersClosingCosts': new FormControl(this.closingCostAmount ? this.closingCostAmount.toString() : null, [Validators.min(this.minClosingCostIncentive)])
		});
	}

	save()
	{
		let salesChangeOrderPriceAdjustments: Array<SalesChangeOrderPriceAdjustment> = [];

		if (this.form.controls['discount'].value !== null)
		{
			salesChangeOrderPriceAdjustments.push({ priceAdjustmentTypeName: 'Discount', amount: this.form.controls['discount'].value, action: 'Add' });
		}

		if (this.form.controls['buyersClosingCosts'].value !== null)
		{
			salesChangeOrderPriceAdjustments.push({ priceAdjustmentTypeName: 'ClosingCost', amount: this.form.controls['buyersClosingCosts'].value, action: 'Add' });
		}

		this.onSavingPriceAdjustments.emit(salesChangeOrderPriceAdjustments);
		this.onEdit.emit(null);
		this.form.reset();
	}

	cancel()
	{
		if (!this.editing || !this.editing.action)
		{
			this.onRemove.emit(-1);
		}

		this.onEdit.emit(null);

		this.form.reset();
	}

	canNavAway(): boolean
	{
		throw new Error("Method not implemented.");
	}

	delete()
	{
		const content = "Sure you want to continue?";
		const confirm = this.modalService.showWarningModal(content);

		confirm.subscribe((result) =>
		{
			if (result)
			{
				this.onDeletePriceAdjustment.emit();
				this.form.reset();
			}
		});
	}

	edit()
	{
		this.onEdit.emit(this.priceAdjustments[0]);

		if (this.discountAmount)
		{
			this.form.controls['discount'].setValue(this.discountAmount);
		}

		if (this.closingCostAmount)
		{
			this.form.controls['buyersClosingCosts'].setValue(this.closingCostAmount);
		}
	}
}
