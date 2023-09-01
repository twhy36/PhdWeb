import { Component, OnInit } from '@angular/core';

import { distinctUntilChanged, filter, tap, switchMap } from 'rxjs/operators';

import { OrganizationService } from '../../../core/services/organization.service';
import { CommunityService } from '../../../core/services/community.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';

import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
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
	canEdit: boolean = false;


	constructor(
		private _orgService: OrganizationService,
		private _communityService: CommunityService,
		private _route: ActivatedRoute) { super(); }

	ngOnInit()
	{
		this.getMonotonyRules();

		this._orgService.canEdit(this._route.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);
	}


	private getMonotonyRules()
	{
		this._orgService.getCurrentMarket().pipe(
			this.takeUntilDestroyed(),
			distinctUntilChanged(),
			filter(mkt => mkt != null),
			tap(mkt => {
				this.market = mkt.id;
			}),
			switchMap(mkt => this._orgService.getFinancialCommunities(mkt.id))
		).subscribe(comm =>
		{
			this.communities = comm.filter(community => community.salesStatusDescription === 'Active');
		});
	}

	toggleElevationRule(community: FinancialCommunity)
	{
		this._communityService.patchFinancialCommunity(community.id, { isElevationMonotonyRuleEnabled: !community.isElevationMonotonyRuleEnabled }).subscribe((res) =>
		{
			community.isElevationMonotonyRuleEnabled = !community.isElevationMonotonyRuleEnabled;
		},
		response =>
		{
			console.log('There was an error', response);
		});
	}

	togglePlanColorScheme(community: FinancialCommunity)
	{
		this._communityService.patchFinancialCommunity(community.id, { isColorSchemePlanRuleEnabled: !community.isColorSchemePlanRuleEnabled, isColorSchemeMonotonyRuleEnabled: community.isColorSchemeMonotonyRuleEnabled ? false : community.isColorSchemeMonotonyRuleEnabled }).subscribe((res) =>
		{
			community.isColorSchemePlanRuleEnabled = res.isColorSchemePlanRuleEnabled;
			community.isColorSchemeMonotonyRuleEnabled = res.isColorSchemeMonotonyRuleEnabled;

		},
		response =>
		{
			console.log('There was an error', response);
		});
	}

	toggleColorScheme(community: FinancialCommunity)
	{
		this._communityService.patchFinancialCommunity(community.id, { isColorSchemeMonotonyRuleEnabled: !community.isColorSchemeMonotonyRuleEnabled, isColorSchemePlanRuleEnabled: community.isColorSchemePlanRuleEnabled ? false : community.isColorSchemePlanRuleEnabled }).subscribe((res) =>
		{
			community.isColorSchemeMonotonyRuleEnabled = res.isColorSchemeMonotonyRuleEnabled;
			community.isColorSchemePlanRuleEnabled = res.isColorSchemePlanRuleEnabled;
		},
		response =>
		{
			console.log('There was an error', response);
		});
	}

	setCurrentCommunity(community: FinancialCommunity) {
		this._orgService.selectCommunity(community);
	}
}
