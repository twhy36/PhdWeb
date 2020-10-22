import { Component, OnInit } from '@angular/core';

import { distinctUntilChanged, filter, tap, switchMap, map, share, flatMap } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

import { OrganizationService } from '../../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';

import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { FinancialCommunityInfo } from '../../../shared/models/financialCommunityInfo.model';
import { Org } from '../../../shared/models/org.model';
import { ActivatedRoute } from '@angular/router';

@Component({
	selector: 'monotony-options',
	templateUrl: './monotony-options.component.html',
	styleUrls: ['./monotony-options.component.scss']
})
export class MonotonyOptionsComponent extends UnsubscribeOnDestroy implements OnInit
{
	communities: Array<FinancialCommunity>;
	market: number;
	financialCommunityInfo: Array<FinancialCommunityInfo>;
	response: any;
	canEdit: boolean = false;


	constructor(
		private _orgService: OrganizationService,
		private _route: ActivatedRoute) { super(); }

	ngOnInit()
	{
		this.getMonotonyRules();

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);
	}


	private getMonotonyRules()
	{
		this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			distinctUntilChanged(),
			filter(mkt => mkt != null),
			tap(mkt => {
				this.market = mkt.id;
			}),
			switchMap(mkt => combineLatest(
					this._orgService.getFinancialCommunities(mkt.id),
					this._orgService.getFinancialCommunitySettings(mkt.id)
				)
			)
		).subscribe(([comm, rules]) =>
		{
			this.communities = comm.filter(community => community.salesStatusDescription === 'Active');
			this.createRules(rules);
		});
	}
	private createRules(communityRules: Array<FinancialCommunityInfo>)
	{
		this.financialCommunityInfo = new Array<FinancialCommunityInfo>()
		this.communities.forEach(community =>
		{
			let communityInfo = communityRules.find(f => f.org.edhFinancialCommunityId === community.id);
			let rules = new FinancialCommunityInfo();

			rules.org = new Org();

			rules.financialCommunityName = community.name;
			rules.org.integrationKey = community.key || "";
			rules.org.edhMarketId = community.marketId;
			rules.org.edhFinancialCommunityId = community.id;

			if (communityInfo)
			{
				rules.isColorSchemeMonotonyRuleEnabled = communityInfo.isColorSchemeMonotonyRuleEnabled;
				rules.isElevationMonotonyRuleEnabled = communityInfo.isElevationMonotonyRuleEnabled;
				rules.financialCommunityId = communityInfo.financialCommunityId;
			}
			else
			{
				rules.isColorSchemeMonotonyRuleEnabled = false;
				rules.isElevationMonotonyRuleEnabled = false;
				rules.financialCommunityId = 0;
			}

			this.financialCommunityInfo.push(rules);
		})
	}

	toggleElevationRule(monotonyRules: FinancialCommunityInfo)
	{
		monotonyRules.isElevationMonotonyRuleEnabled = !monotonyRules.isElevationMonotonyRuleEnabled;
		this._orgService.updateFinancialCommunityInfo(monotonyRules, { 'isElevationMonotonyRuleEnabled': monotonyRules.isElevationMonotonyRuleEnabled }).subscribe((res) =>
		{
			this.response = res;
			if (monotonyRules.financialCommunityId === 0)
			{
				monotonyRules.financialCommunityId = this.response.financialCommunityId;
			}
		},
		response =>
		{
			console.log('There was an error', response);
			monotonyRules.isElevationMonotonyRuleEnabled = !monotonyRules.isElevationMonotonyRuleEnabled;
		});
	}

	toggleColorScheme(monotonyRules: FinancialCommunityInfo)
	{
		monotonyRules.isColorSchemeMonotonyRuleEnabled = !monotonyRules.isColorSchemeMonotonyRuleEnabled
		this._orgService.updateFinancialCommunityInfo(monotonyRules, { 'isColorSchemeMonotonyRuleEnabled': monotonyRules.isColorSchemeMonotonyRuleEnabled }).subscribe((res) =>
		{
			this.response = res;
			if (monotonyRules.financialCommunityId === 0)
			{
				monotonyRules.financialCommunityId = this.response.financialCommunityId;
			}
		},
		response =>
		{
			console.log('There was an error', response);
			monotonyRules.isColorSchemeMonotonyRuleEnabled = !monotonyRules.isColorSchemeMonotonyRuleEnabled;
		});
	}

	setCurrentCommunity(financialCommunityInfo: FinancialCommunityInfo) {
		let selectedCommunity = this.communities.find(t => t.id === financialCommunityInfo.org.edhFinancialCommunityId);
		this._orgService.selectCommunity(selectedCommunity);
	}
}
