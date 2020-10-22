import { Component, Input } from '@angular/core';
import { OrganizationService } from '../../services/organization.service';
import { Observable } from 'rxjs';
import { FinancialMarket } from '@shared/models/financialMarket.model';

@Component({
	selector: 'navigation-bar',
	templateUrl: './navigation-bar.component.html',
	styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent
{
	@Input() canAccessSalesAdmin: boolean;

    constructor(public orgService: OrganizationService) { }

	onSelectedMarketChange(value: FinancialMarket) {
        console.log("Market: ", value);
        this.orgService.selectMarket(value);
    }
}//

