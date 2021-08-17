import {Component} from '@angular/core';
import { Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { IFinancialCommunity, IMarket } from '../../../shared/models/community.model';
import {OrganizationService} from '../../services/organization.service';

@Component({
	selector: 'market-selector',
	templateUrl: './market-selector.component.html',
	styleUrls: ['./market-selector.component.scss']
})
export class MarketSelectorComponent {

	currentCommunity$: Observable<IFinancialCommunity>;
	currentMarket$: Observable<IMarket>;
	markets$: Observable<Array<IMarket>>;
	financialCommunities$: Observable<Array<IFinancialCommunity>>;

	constructor(private orgService: OrganizationService) {
		this.markets$ = this.orgService.markets$;
		this.currentMarket$ = this.orgService.currentMarket$;
		this.currentCommunity$ = this.orgService.currentCommunity$;
		this.financialCommunities$ = this.currentMarket$.pipe(
			filter(m => !!m),
			switchMap(m => this.orgService.getFinancialCommunities(m.id))
		);
	}

	onSelectedMarketChange($event: IMarket){
		//TODO: Remove logs once component is complete in subsequent stories
		console.log($event);
		this.orgService.selectMarket($event);
	}

	onChangeCommunity($event: IFinancialCommunity){
		//TODO: Remove console logs once component is complete in subsequent stories
		console.log($event);
		this.orgService.selectCommunity($event);
	}
}
