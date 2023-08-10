import { Component, Input, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { select, Store } from '@ngrx/store';

import { PriceBreakdown, UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../../ngrx-store/reducers';

@Component({
	selector: 'estimated-totals',
	templateUrl: './estimated-totals.component.html',
	styleUrls: ['./estimated-totals.component.scss'],
	})
export class EstimatedTotalsComponent
	extends UnsubscribeOnDestroy
	implements OnInit
{
	@Input() isPresale: boolean;
	@Input() isPresalePricingEnabled: boolean;
	@Input() isDesignComplete: boolean;

	priceBreakdown: PriceBreakdown;

	constructor(private store: Store<fromRoot.State>) 
	{
		super();
	}

	ngOnInit() 
	{
		this.store
			.pipe(this.takeUntilDestroyed(), select(fromRoot.priceBreakdown))
			.subscribe((pb) => (this.priceBreakdown = pb));
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
