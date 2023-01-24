import { Component, OnInit } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { FinancialCommunityViewModel, HomeSiteViewModel, PlanViewModel } from '../../../shared/models/plan-assignment.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { finalize, map, switchMap } from 'rxjs/operators';
import { FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';
import { combineLatest, forkJoin, of } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { SalesCommunity } from '../../../shared/models/salesCommunity.model';
import { HomeSiteService } from '../../../core/services/homesite.service';
import { PlanService } from '../../../core/services/plan.service';
import { FeatureSwitchService, IdentityService, Permission } from 'phd-common';
import { TreeService } from '../../../core/services/tree.service';

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
	designPreviewUrl?: string = null;
	commmunityLinkEnabledDirty = false;
	previewEnabledDirty = false;
	canToggleCommunitySettings = false;
	environment = environment;
	ecoeRequired = false;
	earnestMoneyRequired = false;
	selectedOption: PlanViewModel = null;
	loading: boolean = false;
	isGeneratingDesignPreviewLink: boolean = false;
	isPhdLite = false;
	isUrlGenerationEnabled: boolean;
	isGenerateUrlButtonDisabled = true;
	isSalesAdminReadOnly = false;

	get saveDisabled(): boolean
	{
		return !this.orgId
			// Disables save if form is invalid and user is not trying to turn on preview
			|| (!this.communitySettingsForm.valid && !this.previewEnabledDirty)
			// Disables save if user trys to remove existing value for ecoeMonths
			|| (this.communitySettingsForm.get('ecoeMonths').invalid && this.communitySettingsForm.get('ecoeMonths').dirty && this.financialCommunityInfo?.defaultECOEMonths != null)
			// Disables save is user trys to remove existing value for earnest money
			|| (this.communitySettingsForm.get('earnestMoney').invalid && this.communitySettingsForm.get('earnestMoney').dirty && this.financialCommunityInfo?.earnestMoneyAmount != null)
			// Disables save if form and toggles are pristine
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

	get plans(): PlanViewModel[]
	{
		return this.selectedCommunity ? this.selectedCommunity.plans : [];
	}

	constructor(
		public _orgService: OrganizationService,
		private _planService: PlanService,
		private _treeService: TreeService,
		private _homeSiteService: HomeSiteService,
		private _msgService: MessageService,
		private _route: ActivatedRoute,
		private _featureSwitchService: FeatureSwitchService,
		private _identityService: IdentityService) { super(); }

	ngOnInit()
	{
		this.createForm();

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);

		this._identityService.hasClaimWithPermission('EnableCommunity', Permission.Edit).pipe(
			this.takeUntilDestroyed(),
		).subscribe((hasClaim) => { this.canToggleCommunitySettings = hasClaim; });

		combineLatest([this._orgService.currentMarket$, this._orgService.currentCommunity$]).pipe(
			this.takeUntilDestroyed(),
			switchMap(([mkt, comm]) =>
			{
				this.currentMarket = mkt;
				this.financialCommunity = comm;

				// If we have both a current market and current financialCommunity get orgs needed to get FinancialCommunityinfo
				if (mkt && comm && comm.marketId === mkt.id)
				{
					this.currentMarket = mkt;

					return combineLatest([
						this._orgService.getInternalOrgs(mkt.id),
						of(comm)
					]);
				}
				else
				{
					this.financialCommunity = null;
					this.selectedCommunity = null;
				}

				return of([null, null]);
			}),
			switchMap(([orgs, comm]) =>
			{
				if (comm != null && (!this.selectedCommunity || this.selectedCommunity.id != comm.id))
				{
					this.orgId = orgs?.find(o => o.edhFinancialCommunityId === comm.id)?.orgID;
					this.selectedCommunity = new FinancialCommunityViewModel(comm);

					this.loadPlansAndHomeSites();

					//init generate url values
					this.disableUrlGeneration();
					this.selectedOption = null;

					if (this.orgId && comm.salesCommunityId)
					{
						// If we have an Org and salesCommunity we get FinancialCommunityInfo, WebsiteCommunity, and SalesCommunity
						return combineLatest([
							this._orgService.getFinancialCommunityInfo(this.orgId),
							this._orgService.getWebsiteCommunity(comm?.salesCommunityId),
							this._orgService.getSalesCommunity(comm?.salesCommunityId)
						]);
					}
				}

				return combineLatest([of(null), of(null), of(null), of(null)]);
			}),
		).subscribe(([finCommInfo, websiteCommunity, salesCommunity]) =>
		{
			this.financialCommunityInfo = finCommInfo;
			this.url = (environment.thoUrl && websiteCommunity?.webSiteIntegrationKey)
				? environment.thoUrl + websiteCommunity.webSiteIntegrationKey
				: null;
			this.salesCommunity = salesCommunity;

			this.createForm();
		}, error =>
		{
			this.financialCommunityInfo = null;
			this.orgId = null;

			this.createForm();

			this._msgService.add({ severity: 'error', summary: 'Error', detail: error });
		});

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			switchMap(comm =>
			{
				return combineLatest(([
					comm ? this._featureSwitchService.isFeatureEnabled('Phd Lite', { edhMarketId: null, edhFinancialCommunityId: comm.id }) : of(false),
					this._featureSwitchService.isFeatureEnabled('Design Preview Presale', { edhMarketId: this.currentMarket.id, edhFinancialCommunityId: comm?.id ?? null }),
				]));
			})
		).subscribe(([isPhdLiteEnabled, isUrlGenerationEnabled]) =>
		{
			this.isPhdLite = !!isPhdLiteEnabled;
			this.isUrlGenerationEnabled = !!isUrlGenerationEnabled;
		});

		this._identityService.hasClaimWithPermission('SalesAdmin', Permission.Edit)
			.subscribe(canEdit => this.isSalesAdminReadOnly = !canEdit);
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
		// Make sure the form is pristine
		this.commmunityLinkEnabledDirty = false;
		this.previewEnabledDirty = false;

		let ecoeMonths = this.financialCommunityInfo ? this.financialCommunityInfo.defaultECOEMonths : null;
		let earnestMoney = this.financialCommunityInfo ? this.financialCommunityInfo.earnestMoneyAmount : null;

		this.communitySettingsForm = new FormGroup({
			'ecoeMonths': new FormControl(ecoeMonths, [Validators.required, Validators.min(1), Validators.max(15)]),
			'earnestMoney': new FormControl(earnestMoney, [Validators.required, Validators.min(0), Validators.max(99999), Validators.pattern("^[0-9]*$")])
		}, []);
	}

	save()
	{
		this.isSaving = true;

		if ((this.communitySettingsForm.dirty || this.commmunityLinkEnabledDirty) && this.communitySettingsForm.valid)
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
					earnestMoneyAmount: earnestMoney
				};
			}

			combineLatest([
				this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId),
				this._orgService.saveSalesCommunity(this.salesCommunity)
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

		if (this.previewEnabledDirty)
		{
			// Still want to be able to enable preview when the form is invalid
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
			});
		}
	}

	onPlanSelectionChanged(selectedPlan: PlanViewModel): void
	{
		this.disableUrlGeneration();

		//enable generate url button when plan is changed and valid plan is selected
		if (selectedPlan && selectedPlan.id)
		{
			this.isGenerateUrlButtonDisabled = false;
		}
	}

	disableUrlGeneration()
	{
		this.designPreviewUrl = '';
		this.isGenerateUrlButtonDisabled = true;
	}

	generateDesignPreviewLink(plan: PlanViewModel) 
	{
		//clear previous results
		this._msgService.clear();
		this.disableUrlGeneration();

		//invalid input plan
		if (!plan || !plan.id)
		{
			this._msgService.add({ severity: 'error', summary: 'Error: Missing or Invalid Plan.', detail: '' });
			return;
		}

		this.isGeneratingDesignPreviewLink = true;
		const planId = plan.id;

		//check if plan has tree
		this._treeService.hasPlanTree(this.selectedCommunity.id, plan.integrationKey).pipe(
			this.takeUntilDestroyed(),
			switchMap(hasTree =>
			{
				if (!hasTree)
				{
					throw new Error('No Published Tree!');
				}

				return this._planService.getDesignPreviewLink(planId);
			}),
			finalize(() =>
			{
				this.isGeneratingDesignPreviewLink = false;
			})
		).subscribe(
			(link =>
			{
				this.designPreviewUrl = link;
			}),
			error =>
			{
				let err = 'Error: Unable to Generate link!';

				if (error.message === 'No Published Tree!')
				{
					err = error.message;
				}

				this._msgService.add({ severity: 'error', summary: err, detail: '' });
			}
		);
	}

	copyToClipboard(text: string)
	{
		navigator.clipboard.writeText(text);
	}

	private loadPlansAndHomeSites()
	{
		let fc = this.selectedCommunity;

		if (!fc.inited)
		{
			this.loading = true;

			const commId = fc.id;

			// get promise of homesites for the financial community
			const lotDtosObs = this._homeSiteService.getCommunityHomeSites(commId);

			// get promise plans for the financial community
			let plansObs = this._planService.getCommunityPlans(commId);

			let obs = forkJoin(lotDtosObs, plansObs).pipe(map(([lotDto, plansDto]) =>
			{
				fc.lots = lotDto.filter(l => l.lotStatusDescription !== 'Closed').map(l => new HomeSiteViewModel(l, fc.dto)).sort(HomeSiteViewModel.sorter);
				fc.plans = plansDto.map(p => new PlanViewModel(p, fc)).sort(PlanViewModel.sorter);

				// add lots to plans
				fc.plans.forEach(p =>
				{
					p.lots = fc.lots.filter(l => l.plans.some(lp => lp === p.id));
				});
			}));

			obs.subscribe(() =>
			{
				fc.inited = true;

				this.loading = false;
			});
		}
	}
}
