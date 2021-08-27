import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Claims, IdentityService } from 'phd-common';
import { of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { OrganizationService } from '../../../core/services/organization.service';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';

enum Tabs
{
	MonotonyRules = 'Monotony Rules',
	AutoApproval = 'Auto Approval',
	PDF = 'PDF Upload - Additional Info.',
	CommunitySettings = 'Community Settings'
}

@Component({
	selector: 'community-management',
	templateUrl: './community-management.component.html',
	styleUrls: ['./community-management.component.scss']
})
export class CommunityManagementComponent extends UnsubscribeOnDestroy implements OnInit
{
	activeCommunities: Array<FinancialCommunityViewModel>;
	selectedCommunity: FinancialCommunityViewModel = null;
	selectedMarket: FinancialMarket = null;
	commTabs = Tabs;
	selectedTab: Tabs;

	get mainTitle(): string
	{
		return 'Community Management > ' + this.selectedTab;
	}

	constructor(private router: Router,
		private _orgService: OrganizationService,
		private identityService: IdentityService){ super();}

	ngOnInit(): void
	{
		this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			switchMap(mkt =>
			{
				if (mkt)
				{
					this.selectedMarket = mkt;
					return this._orgService.getFinancialCommunities(mkt.id);
				}
				else
				{
					this.selectedMarket = null;
					return of([]);
				}
			})
		).subscribe(comms =>
		{
			this.activeCommunities = comms.map(comm => new FinancialCommunityViewModel(comm)).filter(c => c.isActive);
		});

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
		).subscribe(comm =>
		{
			if (comm != null)
			{
				if (!this.selectedCommunity || this.selectedCommunity.id != comm.id)
				{
					this.selectedCommunity = new FinancialCommunityViewModel(comm);
				}
			}
			else
			{
				this.selectedCommunity = null;
			}
		});

		this.identityService.getClaims().pipe(
			take(1)
		).subscribe(
			(claims: Claims) =>
			{
				if (!!claims.SalesAdmin) {
					if (this.router.url.includes('auto-approval'))
					{
						this.selectedTab = this.commTabs.AutoApproval;
					}
					else if (this.router.url.includes('community-pdf'))
					{
						this.selectedTab = this.commTabs.PDF;
					}
					else if (this.router.url.includes('community-settings'))
					{
						this.selectedTab = this.commTabs.CommunitySettings;
					}
					else{
						this.selectedTab = this.commTabs.MonotonyRules;
					}
				}
				else
				{
					this.selectedTab = this.commTabs.AutoApproval;
					this.router.navigateByUrl('/community-management/auto-approval');
				}
			}
		);
	}

	onTabClick(selectedTab: Tabs)
	{
		this.selectedTab = selectedTab;
	}

	onChangeCommunity(comm: FinancialCommunity)
	{
		if (comm != null)
		{
			this._orgService.selectCommunity(comm);
		}
	}

	showCommunitySelect()
	{
		return this.selectedTab !== this.commTabs.MonotonyRules;
	}
}
