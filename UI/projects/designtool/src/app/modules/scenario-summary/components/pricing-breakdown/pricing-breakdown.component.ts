import { OnInit, ChangeDetectorRef, Component, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import { ScenarioService } from '../../../core/services/scenario.service';

import { PriceBreakdown, PriceBreakdownType, DtoScenarioInfo } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

@Component({
	selector: 'pricing-breakdown',
	templateUrl: './pricing-breakdown.component.html',
	styleUrls: ['./pricing-breakdown.component.scss']
})
export class PricingBreakdownComponent implements OnInit
{
	@Input() priceBreakdown: PriceBreakdown;
	@Input() hasHomesite: boolean;
	@Input() isPreview: boolean;
	@Input() allowEstimates: boolean;
	@Input() canConfigure: boolean;

	breakdownFilters: PriceBreakdownType[] = [];
	breakdownStatus = PriceBreakdownType;

	constructor(
		private store: Store<fromRoot.State>,
		public scenarioService: ScenarioService,
		private cd: ChangeDetectorRef) { }

	ngOnInit()
	{
		if (this.allowEstimates)
		{
			if (!this.hasHomesite)
			{
				this.initFilter(this.priceBreakdown.homesiteEstimate, this.breakdownStatus.HOMESITE);
			}

			this.initFilter(this.priceBreakdown.designEstimate, this.breakdownStatus.DESIGN);
		}

		this.initFilter(this.priceBreakdown.salesProgram, this.breakdownStatus.DISCOUNT);
		this.initFilter(this.priceBreakdown.closingIncentive, this.breakdownStatus.CLOSING);		
		this.initFilter(this.priceBreakdown.closingCostAdjustment, this.breakdownStatus.CLOSINGCOSTADJUSTMENT);		
	}

	initFilter(price: number, filterType: PriceBreakdownType)
	{
		if (price > 0)
		{
			this.breakdownFilters.push(filterType);
		}
	}

	onBreakdownFilterChange(toggledFilter: PriceBreakdownType)
	{
		const filterAlreadyOn: number = this.breakdownFilters.findIndex(f => f === toggledFilter);

		if (filterAlreadyOn > -1)
		{
			this.breakdownFilters.splice(filterAlreadyOn, 1);

			this.onPriceChanged(toggledFilter, 0);
		}
		else
		{
			this.breakdownFilters.push(toggledFilter);
		}

		this.cd.detectChanges();
	}

	onPriceChanged(breakdownType: PriceBreakdownType, newPrice: number)
	{
		const priceBreakdown = this.priceBreakdown;

		let oldPrice = 0;
		let newScenarioInfo: DtoScenarioInfo = {
			closingIncentive: priceBreakdown.closingIncentive,
			designEstimate: priceBreakdown.designEstimate,
			discount: priceBreakdown.salesProgram,
			homesiteEstimate: priceBreakdown.homesiteEstimate
		};

		if (breakdownType === PriceBreakdownType.HOMESITE)
		{
			oldPrice = this.priceBreakdown.homesiteEstimate;

			newScenarioInfo.homesiteEstimate = newPrice;
		}
		else if (breakdownType === PriceBreakdownType.DESIGN)
		{
			oldPrice = this.priceBreakdown.designEstimate;

			newScenarioInfo.designEstimate = newPrice;
		}
		else if (breakdownType === PriceBreakdownType.DISCOUNT)
		{
			oldPrice = this.priceBreakdown.salesProgram;

			newScenarioInfo.discount = newPrice;
		}
		else if (breakdownType === PriceBreakdownType.CLOSING)
		{
			oldPrice = this.priceBreakdown.closingIncentive;

			newScenarioInfo.closingIncentive = newPrice;
		}

		if (oldPrice != newPrice)
		{
			let action;

			if (this.isPreview)
			{
				action = new ScenarioActions.ScenarioInfoSaved(newScenarioInfo);
			}
			else
			{
				action = new ScenarioActions.SaveScenarioInfo(newScenarioInfo);
			}

			this.store.dispatch(action);
		}
	}
}

