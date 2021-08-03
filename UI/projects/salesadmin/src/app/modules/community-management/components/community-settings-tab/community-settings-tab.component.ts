import { Component, OnInit } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ActivatedRoute } from '@angular/router';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Component({
	selector: 'community-settings-tab',
	templateUrl: './community-settings-tab.component.html',
	styleUrls: ['./community-settings-tab.component.scss']
})
export class CommunitySettingsTabComponent extends UnsubscribeOnDestroy implements OnInit
{
	selectedCommunity: FinancialCommunityViewModel = null;
	canEdit: boolean = false;
	financialCommunityInfo: FinancialCommunityInfo;
	ecoeMonths: number;
	earnestMoney: number;
	isSaving: boolean;

	constructor(
		public _orgService: OrganizationService,
		private _route: ActivatedRoute) { super(); }

	ngOnInit()
	{
		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			switchMap(comm =>
			{
				if (comm != null)
				{
					if (!this.selectedCommunity || this.selectedCommunity.id != comm.id)
					{
						this.selectedCommunity = new FinancialCommunityViewModel(comm);
						return this._orgService.getFinancialCommunityInfo(this.selectedCommunity.dto.id);
					}
				}
				else
				{
					this.selectedCommunity == null;
					this.ecoeMonths = null;
					this.earnestMoney = null;
					return of(null)
				}
			}),
			map(info => 
			{
				console.log(info);
				this.financialCommunityInfo = info;
				this.ecoeMonths = this.financialCommunityInfo.defaultECOEMonths;
				this.earnestMoney = this.financialCommunityInfo.earnestMoneyAmount;
			})
		);

	}

	save()
	{
		this.financialCommunityInfo.defaultECOEMonths = this.ecoeMonths;
		this.financialCommunityInfo.earnestMoneyAmount = this.earnestMoney;
		this.isSaving = true;

		this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, null)
			.subscribe(() =>
			{
				this.isSaving = false;
			});
	}
}

