import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IFinancialMarket } from '../../../../shared/models/financial-market.model';
import { OrganizationService } from '../../../../core/services/organization.service';

@Component({
	selector: 'divisional-attributes',
	templateUrl: './divisional-attributes.component.html',
	styleUrls: ['./divisional-attributes.component.scss']
})
export class DivisionalAttributesComponent implements OnInit
{
	markets: Array<IFinancialMarket>;
	selectedMarket: IFinancialMarket;
	sidePanelOpen: boolean = false;
	selectDisabled: boolean = false;

	constructor(private router: Router, private route: ActivatedRoute, private _orgService: OrganizationService) { }

	ngOnInit()
	{
		this._orgService.getMarkets().subscribe((data) =>
		{
			this.markets = data;
			this.onInitMarket();
		});
	}

	onInitMarket()
	{
		if (this.markets)
		{
			let marketId = this.route.snapshot.paramMap.get('marketId');

			if (marketId)
			{
				this.selectedMarket = this.markets.find(x => x.id === +marketId);
			}
			else
			{
				//handle default
				if (this._orgService.currentFinancialMarket)
				{
					this.selectedMarket = this.markets.find(x => x.number === this._orgService.currentFinancialMarket);
				}
				else
				{
					this.selectedMarket = this.markets[0];
				}

				this.router.navigate(['divisional-attributes', this.selectedMarket.id, 'attributes'], { relativeTo: this.route.parent });
			}

			// Check for divisional-attribute-wizard. This is in case they try to go the wizard directly. 
			if (this.router.url.includes('/divisional-attribute-wizard'))
			{
				this.selectDisabled = true;
			}
		}
	}

	onMarketSelected(selectedMarket: any)
	{
		let childRoute = 'attributes';

		if (selectedMarket)
		{
			this._orgService.currentFinancialMarket = selectedMarket.number;

			if (this.route && this.route.firstChild && this.route.firstChild.snapshot && this.route.firstChild.snapshot.url && this.route.firstChild.snapshot.url.length > 0)
			{
				childRoute = this.route.firstChild.snapshot.url[0].path;
			}

			this.router.navigate(['divisional-attributes', selectedMarket.id, childRoute], { relativeTo: this.route.parent });
		}
		else
		{
			// default option
			this.router.navigate(['divisional-attributes', 0, childRoute], { relativeTo: this.route.parent });
		}
	}
}
