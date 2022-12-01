import { Component, Input } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { IFinancialCommunity, IMarket } from '../../../shared/models/community.model';
import { OrganizationService } from '../../services/organization.service';
import { ColorAdminService } from '../../services/color-admin.service';
import { NavigationEnd, Router } from '@angular/router';

@Component({
	selector: 'market-selector',
	templateUrl: './market-selector.component.html',
	styleUrls: ['./market-selector.component.scss']
})
export class MarketSelectorComponent
{
	currentCommunity$: Observable<IFinancialCommunity>;
	currentMarket$: Observable<IMarket>;
	markets$: Observable<Array<IMarket>>;
	financialCommunities$: Observable<Array<IFinancialCommunity>>;
	currentUrl: string;
	isOptionPackagesEnabled$: Observable<boolean>;

	@Input() enabled: boolean;

	constructor(
		private orgService: OrganizationService,
		private colorAdminService: ColorAdminService,
		private router: Router)
	{

		this.markets$ = this.orgService.markets$;
		this.currentMarket$ = this.orgService.currentMarket$;
		this.currentCommunity$ = this.orgService.currentCommunity$;

		this.financialCommunities$ = this.currentMarket$.pipe(
			filter(m => !!m),
			switchMap(m => this.orgService.getFinancialCommunities(m.id))
		);

		this.router.events.pipe(
			filter(evt => evt instanceof NavigationEnd)
		).subscribe((evt: NavigationEnd) =>
		{
			this.currentUrl = evt.url
		});

		combineLatest([
			this.orgService.currentMarket$,
			this.orgService.currentCommunity$,
			this.colorAdminService.optionPackagesEnabled$,
		])
		.subscribe(([_m, _c, isOptionPackagesEnabled]: [IMarket, IFinancialCommunity, boolean]) =>
		{
			if (this.currentUrl?.includes("optionpackage") && !isOptionPackagesEnabled)
			{
				this.router.navigate(['/']);
			}
		});
	}

	onSelectedMarketChange($event: IMarket)
	{
		this.orgService.selectMarket($event);
	}

	onChangeCommunity($event: IFinancialCommunity)
	{
		this.orgService.selectCommunity($event);
	}
}
