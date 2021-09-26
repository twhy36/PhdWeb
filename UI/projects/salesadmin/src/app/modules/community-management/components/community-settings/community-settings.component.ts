import { Component, OnInit } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { map, switchMap } from 'rxjs/operators';
import { FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';
import { combineLatest, of } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { SalesCommunity } from '../../../shared/models/salesCommunity.model';
import { IdentityService, Permission } from 'phd-common';

@Component({
	selector: 'community-settings',
	templateUrl: './community-settings.component.html',
	styleUrls: ['./community-settings.component.scss']
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
	canEdit = false;
	isSaving = false;
	url?: string = null;
	commmunityLinkEnabledDirty = false;
	previewEnabledDirty = false;
	canToggleCommunitySettings = false;
	canAccessDesignPreview = false;
	environment = environment;
	ecoeRequired = false;
	earnestMoneyRequired = false;

	get saveDisabled(): boolean
	{
		return !this.orgId
			|| (!this.communitySettingsForm.valid && !this.previewEnabledDirty)
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
		private _identityService: IdentityService,
		private _route: ActivatedRoute) { super(); }

	ngOnInit()
	{
		this.createForm();

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);

		this._identityService.hasClaimWithPermission('EnableCommunity', Permission.Edit).pipe(
			this.takeUntilDestroyed(),
		).subscribe((hasClaim) => { this.canToggleCommunitySettings = hasClaim; });

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			switchMap(financialCommunity => financialCommunity?.salesCommunityId
				? this._orgService.getWebsiteCommunity(financialCommunity?.salesCommunityId)
				: of(null)),
			map(websiteCommunity => websiteCommunity?.webSiteIntegrationKey),
		).subscribe(webSiteIntegrationKey => {
			this.url = (environment.thoUrl && webSiteIntegrationKey)
				? environment.thoUrl + webSiteIntegrationKey
				: null;
		});

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			switchMap(financialCommunity => financialCommunity?.salesCommunityId
				? this._orgService.getSalesCommunity(financialCommunity?.salesCommunityId)
				: of(null)),
		).subscribe(salesCommunity => {
			this.salesCommunity = salesCommunity;
		});

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
		).subscribe(financialCommunity => {
			this.financialCommunity = financialCommunity;
		});

		this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			switchMap(mkt =>
			{
				if (mkt)
				{
					this.currentMarket = mkt;
					if (environment.designPreviewMarketWhitelist.length === 0) {
						this.canAccessDesignPreview = true;
					} else {
						this.canAccessDesignPreview = !!environment.designPreviewMarketWhitelist?.find(id => id === this.currentMarket.id);
					}
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
		if (this.communitySettingsForm.get('ecoeMonths').value && this.communitySettingsForm.get('earnestMoney').value)
		{
			this.ecoeRequired = false;
			this.earnestMoneyRequired = false;
			this.commmunityLinkEnabledDirty = !this.commmunityLinkEnabledDirty;
			this.salesCommunity.isOnlineSalesCommunityEnabled = !this.salesCommunity.isOnlineSalesCommunityEnabled;
		}
		else if (this.communitySettingsForm.get('earnestMoney').value)
		{
			this.ecoeRequired = true;
			this.communitySettingsForm.get('ecoeMonths').markAsDirty();
		}
		else if (this.communitySettingsForm.get('ecoeMonths').value)
		{
			this.earnestMoneyRequired = true;
			this.communitySettingsForm.get('earnestMoney').markAsDirty();
		}
		else
		{
			this.ecoeRequired = true;
			this.earnestMoneyRequired = true;
			this.communitySettingsForm.get('ecoeMonths').markAsDirty();
			this.communitySettingsForm.get('earnestMoney').markAsDirty();
		}
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
			'earnestMoney': new FormControl(earnestMoney, [Validators.required, Validators.min(0), Validators.max(99999), Validators.pattern("^[0-9]*$")])
		}, [])
	}

	save()
	{
		this.isSaving = true;
		if (this.communitySettingsForm.pristine || this.communitySettingsForm.invalid)
		{
			this._orgService.saveFinancialCommunity(this.financialCommunity).subscribe(() =>
			{
				this.isSaving = false;
				this.communitySettingsForm.markAsPristine();
				this.previewEnabledDirty = false;
				this.commmunityLinkEnabledDirty = false;
				this.ecoeRequired = false;
				this.earnestMoneyRequired = false;
				this._msgService.add({ severity: 'success', summary: 'Community Settings', detail: 'Save successful.' });
			}, error =>
			{
				this.isSaving = false;
				this._msgService.add({ severity: 'error', summary: 'Error', detail: `Save failed. ${error}` });
			})
		}
		else
		{
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

			combineLatest([
				this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId),
				this._orgService.saveSalesCommunity(this.salesCommunity),
				this._orgService.saveFinancialCommunity(this.financialCommunity)
			]).subscribe(() =>
				{
					this.isSaving = false;
					this.communitySettingsForm.markAsPristine();
					this.commmunityLinkEnabledDirty = false;
					this.previewEnabledDirty = false;
					this.ecoeRequired = false;
					this.earnestMoneyRequired = false;
					this._msgService.add({ severity: 'success', summary: 'Community Settings', detail: 'Save successful.' });
				}, error =>
				{
					this.isSaving = false;
					this._msgService.add({ severity: 'error', summary: 'Error', detail: `Save failed. ${error}` });
				});
		}
	}
}

