import { Component, Input, Output, ViewEncapsulation, EventEmitter } from '@angular/core';
import { LinkAction } from '../../models/action.model';
import { environment } from '../../../../../environments/environment';
import { IFinancialCommunity, ISalesCommunity } from '../../models/community.model';

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
	selectedSalesCommunity: ISalesCommunity = null;
	selectedSpecOrHomes: string = 'spec';

	constructor() { }

	close()
	{
		this.onClose.emit();
	}

	save()
	{
		const url = `${environment.baseUrl.designTool}${this.action.path}/${this.selectedSpecOrHomes}/${this.selectedMarket}/${this.selectedSalesCommunity.id}`;

		window.open(url, '_blank');
	}

	onMarketChange(market)
	{
		this.selectedMarket = market;
	}

	onFinancialCommunityChange(community: IFinancialCommunity)
	{
		this.selectedFinancialCommunity = community.id;
	}

	onSalesCommunityChange(salesCommunity: ISalesCommunity)
	{
		this.selectedSalesCommunity = salesCommunity;
	}

	changeBuildType(buildType: string)
	{
		this.selectedSpecOrHomes = buildType;
	}
}
