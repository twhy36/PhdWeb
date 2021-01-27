import { Component, OnInit } from '@angular/core';
import { switchMap, map, tap } from 'rxjs/operators';
import { OrganizationService } from '../../core/services/organization.service';
import { Observable, of } from 'rxjs';

import { FinancialCommunityViewModel } from '../../shared/models/plan-assignment.model';
import { UnsubscribeOnDestroy } from '../../shared/utils/unsubscribe-on-destroy';
import { FinancialCommunity } from '../../shared/models/financialCommunity.model';
import { ChangeOrderTypeAutoApproval } from '../../shared/models/changeOrderTypeAutoApproval.model';
import { CommunityService } from '../../core/services/community.service';
import { MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';

@Component({
	selector: 'auto-approval',
	templateUrl: './auto-approvals.component.html',
	styleUrls: ['./auto-approvals.component.scss']
})
export class AutoApprovalComponent extends UnsubscribeOnDestroy implements OnInit
{

	activeCommunities: Observable<Array<FinancialCommunityViewModel>>;
	market: number;
	selectedCommunity: FinancialCommunityViewModel = null;
	approvals: Array<ChangeOrderTypeAutoApproval>;
	selectAll: boolean = false;
	jio: ChangeOrderTypeAutoApproval;
	plan: ChangeOrderTypeAutoApproval;
	elevation: ChangeOrderTypeAutoApproval;
	handing: ChangeOrderTypeAutoApproval;
	choiceAttribute: ChangeOrderTypeAutoApproval;
	homesiteTransfer: ChangeOrderTypeAutoApproval;
	nonStandardOption: ChangeOrderTypeAutoApproval;
	isLoading: boolean = true;
	canEdit: boolean = false;

	constructor(public _orgService: OrganizationService,
		private _communityService: CommunityService,
		private _route: ActivatedRoute,
		private _msgService: MessageService) { super(); }


	ngOnInit()
	{
		this.isLoading = true;
		this.activeCommunities = this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			tap(() => this.isLoading = true),
			switchMap(mkt =>
			{
				if (mkt)
				{
					return this._orgService.getFinancialCommunities(mkt.id);
				}
				else
				{
					return of([]);
				}
			}),
			map(comms => comms.map(comm => new FinancialCommunityViewModel(comm)).filter(c => c.isActive))
		);

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
		).subscribe(comm =>
		{
			if (comm != null)
			{
				if (!this.selectedCommunity || this.selectedCommunity.id != comm.id)
				{
					this.selectedCommunity = new FinancialCommunityViewModel(comm);
					this.populateApprovals();
				}
			}
			else
			{
				this.selectedCommunity = null;
			}
		});

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	populateApprovals()
	{
		this.isLoading = true;
		this.approvals = [];

		this._communityService.getChangeOrderTypeAutoApprovals(this.selectedCommunity.id).subscribe(data =>
		{
			// valid typeIds
			let changeOrderTypeIds = [0, 1, 2, 3, 4, 5, 6];

			// filter out unused typeIds
			this.approvals = data.filter(x => changeOrderTypeIds.findIndex(y => y === x.edhChangeOrderTypeId) > -1);

			this.jio = this.approvals.find(x => x.edhChangeOrderTypeId === 0);
			this.plan = this.approvals.find(x => x.edhChangeOrderTypeId === 1);
			this.elevation = this.approvals.find(x => x.edhChangeOrderTypeId === 2);
			this.handing = this.approvals.find(x => x.edhChangeOrderTypeId === 3);
			this.choiceAttribute = this.approvals.find(x => x.edhChangeOrderTypeId === 4);
			this.homesiteTransfer = this.approvals.find(x => x.edhChangeOrderTypeId === 5);
			this.nonStandardOption = this.approvals.find(x => x.edhChangeOrderTypeId === 6);
			this.isLoading = false;

			if (this.approvals.filter(x => x.isAutoApproval === true).length === 7)
			{
				this.selectAll = true;
			}
			else if (this.approvals.filter(x => x.isAutoApproval === true).length < 7)
			{
				this.selectAll = false;
			}
		});
	}

	toggleRule(ruleType: number)
	{
		let approval = this.approvals.find(x => x.edhChangeOrderTypeId === ruleType)
		approval.isAutoApproval = !approval.isAutoApproval;

		this.saveRule([approval]).subscribe(response =>
		{
			this._msgService.add({ severity: 'success', summary: 'Auto Approval', detail: 'Auto Approval saved successfully' });

			if (this.approvals.filter(x => x.isAutoApproval === true).length === 7)
			{
				this.selectAll = true;
			}
			else if (this.approvals.filter(x => x.isAutoApproval === true).length < 7)
			{
				this.selectAll = false;
			}
		},
		() =>
		{
			this._msgService.add({ severity: 'error', summary: 'Error', detail: 'Auto Approval failed to save' });

			approval.isAutoApproval = !approval.isAutoApproval;
		});
	}

	selectAllToggle(event: any)
	{
		const changedApprovals = this.approvals.filter(a => a.isAutoApproval !== event && a.edhChangeOrderTypeId !== 0).map(a => { return { ...a, isAutoApproval: event }; })

		this.saveRule(changedApprovals).subscribe(response =>
		{
			this._msgService.add({ severity: 'success', summary: 'Auto Approval', detail: 'Auto Approval saved successfully' });

			this.approvals.map(a => a.edhChangeOrderTypeId === 0 ? a.isAutoApproval : a.isAutoApproval = event);
		},
		() =>
		{
			this._msgService.add({ severity: 'error', summary: 'Error', detail: 'Auto Approval failed to save' });

			this.selectAll = !this.selectAll;
		});
	}

	saveRule(rule: Array<ChangeOrderTypeAutoApproval>)
	{
		return this._communityService.patchChangeOrderTypeAutoApprovals(rule);
	}

	onChangeCommunity(comm: FinancialCommunity)
	{
		if (comm != null)
		{
			this.isLoading = true;

			this._orgService.selectCommunity(comm);
		}
	}
}

