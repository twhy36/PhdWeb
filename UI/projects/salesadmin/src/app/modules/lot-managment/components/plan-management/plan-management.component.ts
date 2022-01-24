import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { OrganizationService } from "../../../core/services/organization.service";
import { FinancialCommunity } from "../../../shared/models/financialCommunity.model";
import { FinancialCommunityViewModel } from "../../../shared/models/plan-assignment.model";
import { UnsubscribeOnDestroy } from "../../../shared/utils/unsubscribe-on-destroy";

enum Tabs
{
	HomePlanAssignments = 'Home Plan Assignments',
	LotRelationships = 'Lot Relationships'
}
@Component({
	selector: 'plan-management',
	templateUrl: './plan-management.component.html',
	styleUrls: ['./plan-management.component.scss']
})
export class PlanManagementComponent extends UnsubscribeOnDestroy implements OnInit
{
	activeCommunities: Observable<Array<FinancialCommunityViewModel>>;
	commTabs = Tabs;
	selectedCommunity: FinancialCommunityViewModel;
	selectedTab: Tabs;
	
	constructor(private router: Router,
		private _orgService: OrganizationService) { super(); }

	ngOnInit()
	{
		this.activeCommunities = this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			switchMap(mkt =>
			{
				if (mkt)
				{
					return this._orgService.getFinancialCommunities(mkt.id);
				}
				else
				{
					return of(null);
				}
			}),
			map(comms =>
			{
				return comms.map(comm => new FinancialCommunityViewModel(comm)).filter(c => c.isActive);
			}),
		);

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed()
		).subscribe(comm =>
		{
			if (comm != null)
			{
				this.selectedCommunity = new FinancialCommunityViewModel(comm);
			}
			else
			{
				this.selectedCommunity = null;
			}
		});

		if (this.router.url.includes('lot-relationships'))
		{
			this.selectedTab = this.commTabs.LotRelationships;
		}
		else
		{
			this.selectedTab = this.commTabs.HomePlanAssignments;
		}
		
	}

	onChangeCommunity(comm: FinancialCommunity)
	{
		if (comm != null)
		{
			this._orgService.selectCommunity(comm);
		}
	}

	onTabClick(selectedTab: Tabs)
	{
		this.selectedTab = selectedTab;
	}
}