import { Component, Input, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';

import { PriceBreakdown, UnsubscribeOnDestroy } from 'phd-common';
import { combineLatest } from 'rxjs';

import * as fromRoot from '../../../ngrx-store/reducers';

@Component({
	selector: 'estimated-totals',
	templateUrl: './estimated-totals.component.html',
	styleUrls: ['./estimated-totals.component.scss'],
// eslint-disable-next-line indent
})
export class EstimatedTotalsComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() isPresale: boolean;
	@Input() isPresalePricingEnabled: boolean;

	isDesignComplete: boolean;
	priceBreakdown: PriceBreakdown;

	constructor(private store: Store<fromRoot.State>) 
	{
		super();
	}

	ngOnInit() 
	{
		combineLatest([
			this.store.pipe(this.takeUntilDestroyed(), select((state) => state.salesAgreement)),
			this.store.pipe(this.takeUntilDestroyed(), select(fromRoot.priceBreakdown))
		]).subscribe(([sag, pb]) =>
		{
			this.isDesignComplete = sag?.isDesignComplete || false;
			this.priceBreakdown = pb;
		});
	}

	get totalPriceLabel(): string 
	{
		if (this.isPresale && this.isPresalePricingEnabled) 
		{
			return 'Estimated Total Price';
		}

		return this.isDesignComplete
			? 'Total Purchase Price'
			: 'Estimated Total Purchase Price';
	}
}
