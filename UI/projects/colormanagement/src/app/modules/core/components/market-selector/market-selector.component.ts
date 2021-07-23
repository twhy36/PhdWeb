import {Component} from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { IFinancialCommunity, IMarket } from '../../../shared/models/community.model';
import {OrganizationService} from '../../services/organization.service';

@Component({
	selector: 'market-selector',
	templateUrl: './market-selector.component.html',
	styleUrls: ['./market-selector.component.scss']
})
export class MarketSelectorComponent {

	currentCommunity$ = new BehaviorSubject<IFinancialCommunity>(null);

	get currentMarket(): Subject<IMarket>{
		return this.orgService.currentFinancialMarket$ as unknown as Subject<IMarket>
	}

	constructor(public orgService: OrganizationService) { }

	onSelectedMarketChange($event: string){
		//TODO: Remove logs once component is complete in subsequent stories
		console.log($event);
		this.orgService.currentFinancialMarket = $event;
	}

	onChangeCommunity($event: string){
		//TODO: Remove console logs once component is complete in subsequent stories
		this.currentCommunity$.next($event as unknown as IFinancialCommunity);
		console.log($event);
	}
}
