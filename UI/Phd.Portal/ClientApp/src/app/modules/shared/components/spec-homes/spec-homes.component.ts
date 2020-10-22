import { Component, Input, Output, ViewEncapsulation, EventEmitter } from '@angular/core';
import { LinkAction } from '../../models/action.model';
import { environment } from '../../../../../environments/environment';

@Component({
	selector: 'spec-homes',
	templateUrl: './spec-homes.component.html',
	styleUrls: ['./spec-homes.component.scss'],
	encapsulation: ViewEncapsulation.None
})

export class SpecHomeComponent
{
	@Input() action: LinkAction;

	@Output() onClose = new EventEmitter<void>();

	selectedMarket: number = null;
	selectedFinancialCommunity: number = null;
	selectedSalesCommunity: number = null;
	selectedSpecOrHomes: string = 'spec';

	constructor() { }

	close()
	{
		this.onClose.emit();
	}

	save()
	{
		const url = `${environment.baseUrl.designTool}${this.action.path}/${this.selectedSpecOrHomes}/${this.selectedMarket}/${this.selectedSalesCommunity}`;

		window.open(url, "_blank");
	}

	onMarketChange(market)
	{
		this.selectedMarket = market;
	}

	onFinancialCommunityChange(community)
	{
		this.selectedFinancialCommunity = community;
	}

	onSalesCommunityChange(salesCommunity)
	{
		this.selectedSalesCommunity = salesCommunity;
	}

}
