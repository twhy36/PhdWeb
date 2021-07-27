import {Component} from '@angular/core';
import { Subject } from 'rxjs';
import { IFinancialCommunity, IMarket } from '../../../shared/models/community.model';
import {OrganizationService} from '../../services/organization.service';

@Component({
	selector: 'market-selector',
	templateUrl: './market-selector.component.html',
	styleUrls: ['./market-selector.component.scss']
})
export class MarketSelectorComponent {


	get currentMarket$(): Subject<IMarket>{
		return this.orgService.currentFinancialMarket$;
	}

	get currentCommunity$(): Subject<IFinancialCommunity>{
		return this.orgService.currentFinancialCommunity$;
	}

	constructor(public orgService: OrganizationService) { }

	onSelectedMarketChange($event: IMarket){
		//TODO: Remove logs once component is complete in subsequent stories
		console.log($event);
		this.orgService.currentFinancialMarket = $event;
		//reset community list when new market is selected
		this.orgService.currentFinancialCommunity = null;
	}

	onChangeCommunity($event: IFinancialCommunity){
		//TODO: Remove console logs once component is complete in subsequent stories
		this.orgService.currentFinancialCommunity = $event;
		console.log($event);
	}
}
