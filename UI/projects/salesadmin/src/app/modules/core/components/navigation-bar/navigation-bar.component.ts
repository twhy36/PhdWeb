import { Component, Input, OnInit } from '@angular/core';
import { OrganizationService } from '../../services/organization.service';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UnsubscribeOnDestroy } from 'phd-common';
import { filter, map } from 'rxjs/operators';

@Component({
	selector: 'navigation-bar',
	templateUrl: './navigation-bar.component.html',
	styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() canAccessSalesAdmin: boolean;
	hideMarket:  boolean;

    constructor(
		public orgService: OrganizationService,
		private router: Router,
		private route: ActivatedRoute )  { super(); }

	ngOnInit() 
	{
        this.router.events.pipe(
			this.takeUntilDestroyed(),
            filter(evt => evt instanceof NavigationEnd),
            map(() => {
                let snapshot = this.route.snapshot;
                do {
                    if (snapshot.data['hideMarket']){
                        return snapshot.data['hideMarket'];
                    } 
                    snapshot = snapshot.children?.find(c => c.outlet === 'primary');
                }
                while (snapshot);
 
                return false;
            })
        ).subscribe(hideMarket => {
            this.hideMarket = hideMarket
        });
	}
	onSelectedMarketChange(value: FinancialMarket) {
        console.log("Market: ", value);
        this.orgService.selectMarket(value);
    }
}//

