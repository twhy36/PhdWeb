import { combineLatest } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';

import { OrganizationService } from '../../core/services/organization.service';
import { ReOrgService } from '../../core/services/re-org.service';

import { UnsubscribeOnDestroy } from '../../shared/utils/unsubscribe-on-destroy';
import { FinancialMarket } from '../../shared/models/financialMarket.model';
import { ReOrg } from '../../shared/models/re-org.model';
import { NotificationService } from '../../core/services/notification.service';
import { ActivatedRoute } from '@angular/router';

@Component({
	selector: 're-org',
	templateUrl: './re-org.component.html',
	styleUrls: ['./re-org.component.scss']
})
export class ReOrgComponent extends UnsubscribeOnDestroy implements OnInit {
	markets: Array<FinancialMarket>;
	sourceMarket: FinancialMarket;
	destinationMarket: FinancialMarket;
	reOrgs: Array<ReOrg>;
	showMarketSelect: boolean;
	get reOrgDisabled()
	{
		let disabled = !this.sourceMarket || !this.destinationMarket;
		return disabled;
	}

	constructor(
		private _orgService: OrganizationService,
		private _reOrgService: ReOrgService,
		private _notificationService: NotificationService,
		private route: ActivatedRoute
		) { super(); }

	ngOnInit() {
		this._reOrgService.reorgsUpdatedFlag.subscribe(update => {
			if(update)
			{
				this.getReOrgs();
			}
		} )
		this.getReOrgs();

		
		this.route.data.subscribe(data => {
			if(data["isReOrg"])
			{
			this.showMarketSelect = !data["isReOrg"];
			}
		});
	}

	getReOrgs()
	{
		this._orgService.salesMarkets.pipe(
			combineLatest(this._reOrgService.getReOrgs())).subscribe(
			([markets, reOrgs]) => {
				this.markets = markets;
				this.reOrgs = reOrgs;
				this.updateReOrgMarketNames();
		});
	}
	onDestinationMarketChange(value: FinancialMarket) {
        this.destinationMarket = value;
    }

	onSourceMarketChange(value: FinancialMarket) {
		this.sourceMarket = value;
	}

	executeReOrg() {
		this._notificationService.init().subscribe(() => {
			this._notificationService.registerHandlers();
			this._reOrgService.executeReOrg(this.sourceMarket.id, this.destinationMarket.id);
		});
	}

	loadReOrgs()
	{
		this._reOrgService.getReOrgs().subscribe(reOrgs => {
			this.reOrgs = reOrgs
			this.updateReOrgMarketNames()
		});
	}

	updateReOrgMarketNames()
	{
		this.reOrgs.map(reOrg => {
			reOrg.sourceMarketName = this.markets.find(market => market.id === reOrg.sourceMarketId).name;
			reOrg.targetMarketName = this.markets.find(market => market.id === reOrg.targetMarketId).name;
		})
	}
}
