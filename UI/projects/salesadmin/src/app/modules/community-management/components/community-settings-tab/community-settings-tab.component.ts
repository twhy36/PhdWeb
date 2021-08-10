import { Component, OnInit } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ActivatedRoute } from '@angular/router';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';
import { combineLatest, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';

@Component({
	selector: 'community-settings-tab',
	templateUrl: './community-settings-tab.component.html',
	styleUrls: ['./community-settings-tab.component.scss']
})
export class CommunitySettingsTabComponent extends UnsubscribeOnDestroy implements OnInit
{
	financialCommunityInfo: FinancialCommunityInfo;
	selectedCommunity: FinancialCommunityViewModel = null;
	communitySettingsForm: FormGroup;
	currentMarket: FinancialMarket;
	orgId: number;
	canEdit: boolean = false;
	isSaving: boolean;

	get saveDisabled(): boolean
	{
		return this.communitySettingsForm.pristine || !this.communitySettingsForm.valid || !this.orgId;
	}

	constructor(
		public _orgService: OrganizationService,
		private _msgService: MessageService,
		private _route: ActivatedRoute) { super(); }

	ngOnInit()
	{
		this.createForm();

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);

		this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			switchMap(mkt =>
			{
				if (mkt)
				{
					this.currentMarket = mkt;
					return combineLatest([this._orgService.getInternalOrgs(mkt.id), this._orgService.currentCommunity$]);
				}
				return of([null, null]);
			}),
			switchMap(([orgs, comm]) =>
			{
				if (comm != null && (!this.selectedCommunity || this.selectedCommunity.id != comm.id))
				{
					this.orgId = orgs?.find(o => o.edhFinancialCommunityId === comm.id)?.orgID;
					this.selectedCommunity = new FinancialCommunityViewModel(comm);

					if (this.orgId)
					{
						return this._orgService.getFinancialCommunityInfo(this.orgId);
					}
				}
				return of(null);
			}),
		).subscribe(finCommInfo =>
		{
			this.financialCommunityInfo = finCommInfo;
			this.createForm();
		}, error =>
		{
			this.financialCommunityInfo = null;
			this.orgId = null;
			this.createForm();
			this._msgService.add({ severity: 'error', summary: 'Error', detail: error });
		});
	}

	createForm()
	{
		let ecoeMonths = this.financialCommunityInfo ? this.financialCommunityInfo.defaultECOEMonths : null;
		let earnestMoney = this.financialCommunityInfo ? this.financialCommunityInfo.earnestMoneyAmount : null;

		this.communitySettingsForm = new FormGroup({
			'ecoeMonths': new FormControl(ecoeMonths, [Validators.required, Validators.min(1), Validators.max(15)]),
			'earnestMoney': new FormControl(earnestMoney,[Validators.required, Validators.min(0), Validators.max(99999)])
		}, [])
	}

	save()
	{
		this.isSaving = true;
		let ecoeMonths = this.communitySettingsForm.get('ecoeMonths').value;
		let earnestMoney = this.communitySettingsForm.get('earnestMoney').value;
		if (this.financialCommunityInfo)
		{
			this.financialCommunityInfo.defaultECOEMonths = ecoeMonths ?? this.financialCommunityInfo.defaultECOEMonths;
			this.financialCommunityInfo.earnestMoneyAmount = earnestMoney ?? this.financialCommunityInfo.earnestMoneyAmount;
		}
		else
		{
			this.financialCommunityInfo =
			{
				financialCommunityId: 0,
				defaultECOEMonths: ecoeMonths,
				earnestMoneyAmount: earnestMoney,
			}
		}

		this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId)
			.subscribe(() =>
			{
				this.isSaving = false;
				this._msgService.add({ severity: 'success', summary: 'Community Settings', detail: 'Save successful.' });
			}, error =>
			{
				this.isSaving = false;
				this._msgService.add({ severity: 'error', summary: 'Error', detail: `Save failed. ${error}` });
			});
	}
}

