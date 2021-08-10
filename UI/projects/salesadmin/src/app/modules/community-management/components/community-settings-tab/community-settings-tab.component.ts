import { Component, OnInit } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { identity } from 'lodash';
import { FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';
import { combineLatest, of } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { SalesCommunity } from '../../../shared/models/salesCommunity.model';

@Component({
	selector: 'community-settings-tab',
	templateUrl: './community-settings-tab.component.html',
	styleUrls: ['./community-settings-tab.component.scss']
})
export class CommunitySettingsTabComponent extends UnsubscribeOnDestroy implements OnInit
{
	financialCommunity: FinancialCommunity = null;
	financialCommunityInfo: FinancialCommunityInfo;
	selectedCommunity: FinancialCommunityViewModel = null;
	salesCommunity: SalesCommunity = null;
	communitySettingsForm: FormGroup;
	currentMarket: FinancialMarket;
	orgId: number;
	canEdit: boolean = false;
	isSaving: number = 0;
	url?: string = null;
	commmunityLinkEnabledDirty = false;
	previewEnabledDirty = false;

	get saveDisabled(): boolean
	{
		return !this.orgId
			|| !this.communitySettingsForm.valid
			|| (
				this.communitySettingsForm.pristine
				&& !this.commmunityLinkEnabledDirty
				&& !this.previewEnabledDirty
			);
	}

	get isCommunityLinkEnabled(): boolean
	{
		return this.salesCommunity?.isOnlineSalesCommunityEnabled;
	}

	get isPreviewEnabled(): boolean
	{
		return this.financialCommunity?.isDesignPreviewEnabled;
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

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			filter(financialCommunity => !!financialCommunity?.salesCommunityId),
			switchMap(financialCommunity => this._orgService.getWebsiteCommunity(financialCommunity?.salesCommunityId)),
			map(websiteCommunity => websiteCommunity?.webSiteIntegrationKey),
		).subscribe(webSiteIntegrationKey => {
			this.url = (environment.thoUrl && webSiteIntegrationKey)
				? environment.thoUrl + webSiteIntegrationKey
				: null;
		});

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			switchMap(financialCommunity => this._orgService.getSalesCommunity(financialCommunity?.salesCommunityId)),
		).subscribe(salesCommunity => {
			this.salesCommunity = salesCommunity;
		});

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
		).subscribe(financialCommunity => {
			console.log('changed', financialCommunity);
			this.financialCommunity = financialCommunity;
		});

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

	toggleCommunityLinkEnabled()
	{
		this.commmunityLinkEnabledDirty = !this.commmunityLinkEnabledDirty;
		this.salesCommunity.isOnlineSalesCommunityEnabled = !this.salesCommunity.isOnlineSalesCommunityEnabled;
	}

	togglePreviewEnabled()
	{
		this.previewEnabledDirty = !this.previewEnabledDirty;
		this.financialCommunity.isDesignPreviewEnabled = !this.financialCommunity.isDesignPreviewEnabled;
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
		this.isSaving = 3;
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
				this.isSaving--;
				this._msgService.add({ severity: 'success', summary: 'Community Settings', detail: 'Save ecoe and earnest money setting successful.' });
			}, error =>
			{
				this.isSaving--;
				this._msgService.add({ severity: 'error', summary: 'Error', detail: `Save failed. ${error}` });
			});

		this.commmunityLinkEnabledDirty = false;
		this._orgService.saveSalesCommunity(this.salesCommunity)
			.subscribe(() =>
			{
				this.isSaving--;
				this._msgService.add({ severity: 'success', summary: 'Community Settings', detail: 'Save community link enabled successful.' });
			}, error =>
			{
				this.isSaving--;
				this._msgService.add({ severity: 'error', summary: 'Error', detail: `Save failed. ${error}` });
			});

		this.previewEnabledDirty = false;
		this._orgService.saveFinancialCommunity(this.financialCommunity)
			.subscribe(() =>
			{
				this.isSaving--;
				this._msgService.add({ severity: 'success', summary: 'Community Settings', detail: 'Save preview enabled successful.' });
			}, error =>
			{
				this.isSaving--;
				this._msgService.add({ severity: 'error', summary: 'Error', detail: `Save failed. ${error}` });
			});
	}
}

