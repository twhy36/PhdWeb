import { Component, OnInit } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { FinancialCommunityViewModel, HomeSiteViewModel, PlanViewModel } from '../../../shared/models/plan-assignment.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { finalize, map, switchMap } from 'rxjs/operators';
import { FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';
import * as _ from 'lodash';
import { combineLatest, forkJoin, of } from 'rxjs';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { SalesCommunity } from '../../../shared/models/salesCommunity.model';
import { HomeSiteService } from '../../../core/services/homesite.service';
import { PlanService } from '../../../core/services/plan.service';
import { FeatureSwitchService, IdentityService, Permission, BrandService, FinancialBrand, getBrandUrl } from 'phd-common';
import { TreeService } from '../../../core/services/tree.service';

@Component({
	selector: 'community-settings',
	templateUrl: './community-settings.component.html',
	styleUrls: ['./community-settings.component.scss']
})
export class CommunitySettingsTabComponent extends UnsubscribeOnDestroy implements OnInit
{
	//Financial communites within the current sales community.
	salesCommunityFinancialCommunities: Array<FinancialCommunity> = null;
	financialCommunity: FinancialCommunity = null;
	formFinancialCommunity: FinancialCommunity;
	financialCommunityInfo: FinancialCommunityInfo;
	selectedCommunity: FinancialCommunityViewModel = null;
	salesCommunity: SalesCommunity = null;
	communitySettingsForm: UntypedFormGroup;
	currentMarket: FinancialMarket;
	orgId: number;
	canEdit = false;
	isSaving = false;
	financialBrand: FinancialBrand;
	url?: string = null;
	designPreviewUrl?: string = null;
	commmunityLinkEnabledDirty = false;
	previewEnabledDirty = false;
	canToggleCommunitySettings = false;
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
		return this.financialCommunity?.isOnlineSalesEnabled;
	}

	get isPreviewEnabled(): boolean
	{
		return this.formFinancialCommunity?.isDesignPreviewEnabled;
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
		private _identityService: IdentityService,
		private _brandService: BrandService) { super(); }

	ngOnInit()
	{
		this.createForm();

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);

		combineLatest([this._orgService.getCurrentMarket(), this._orgService.currentCommunity$]).pipe(
			this.takeUntilDestroyed(),
			switchMap(([mkt, comm]) =>
			{
				this.currentMarket = mkt;
				this.financialCommunity = comm;

				// This need to be deep copied so that changes that aren't saved aren't made to the original
				this.formFinancialCommunity = this.financialCommunity ? JSON.parse(JSON.stringify(this.financialCommunity)) : null;

				// If we have both a current market and current financialCommunity get orgs needed to get FinancialCommunityinfo
				if (mkt && comm && comm.marketId === mkt.id)
				{
					return combineLatest([
						this._orgService.getInternalOrgs(mkt.id),
						of(comm)
					]);
				}
				else
				{
					this.financialCommunity = null;
					this.selectedCommunity = null;
					this.formFinancialCommunity = null;
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

					// init generate url values
					this.disableUrlGeneration();
					this.selectedOption = null;

					if (this.orgId && comm.salesCommunityId)
					{
						// If we have an Org and salesCommunity we get FinancialCommunityInfo, WebsiteCommunity, SalesCommunity and FinancialBrand
						return combineLatest([
							this._orgService.getFinancialCommunitiesBySalesCommunityId(comm?.salesCommunityId),
							this._orgService.getFinancialCommunityInfo(this.orgId),
							this._orgService.getWebsiteCommunity(comm?.salesCommunityId),
							this._orgService.getSalesCommunity(comm?.salesCommunityId),
							this._brandService.getFinancialBrand(this.financialCommunity.financialBrandId, environment.apiUrl)
						]);
					}
				}

				return combineLatest([of(null), of(null), of(null), of(null), of(null)]);
			}),
		).subscribe(([salesCommunityFinancialCommunities, finCommInfo, websiteCommunity, salesCommunity, financialBrand]) =>
		{
			this.salesCommunityFinancialCommunities = salesCommunityFinancialCommunities;

			this.financialCommunityInfo = finCommInfo;

			this.financialBrand = financialBrand;
			if (financialBrand)
			{
				const brandUrl = getBrandUrl(financialBrand.key, environment.thoUrls);
				this.url = (brandUrl && websiteCommunity?.webSiteIntegrationKey)
					? `${brandUrl}${websiteCommunity.webSiteIntegrationKey}`
					: null;
			}

			this.canToggleCommunitySettings = true;
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
			this.financialCommunity.isOnlineSalesEnabled = !this.financialCommunity.isOnlineSalesEnabled;

			this.salesCommunity.isOnlineSalesCommunityEnabled = this.financialCommunity.isOnlineSalesEnabled || this.salesCommunityFinancialCommunities.some(x => x.isOnlineSalesEnabled);
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
		this.formFinancialCommunity.isDesignPreviewEnabled = !this.formFinancialCommunity.isDesignPreviewEnabled;
	}

	createForm()
	{
		// Make sure the form is pristine
		this.commmunityLinkEnabledDirty = false;
		this.previewEnabledDirty = false;

		const ecoeMonths = this.financialCommunityInfo ? this.financialCommunityInfo.defaultECOEMonths : null;
		const earnestMoney = this.financialCommunityInfo ? this.financialCommunityInfo.earnestMoneyAmount : null;

		this.communitySettingsForm = new UntypedFormGroup({
			'ecoeMonths': new UntypedFormControl(ecoeMonths, [Validators.required, Validators.min(1), Validators.max(15)]),
			'earnestMoney': new UntypedFormControl(earnestMoney, [Validators.required, Validators.min(0), Validators.max(99999), Validators.pattern('^[0-9]*$')])
		}, []);
	}

	save()
	{
		this.isSaving = true;

		if ((this.communitySettingsForm.dirty || this.commmunityLinkEnabledDirty) && this.communitySettingsForm.valid)
		{
			const ecoeMonths = this.communitySettingsForm.get('ecoeMonths').value;
			const earnestMoney = this.communitySettingsForm.get('earnestMoney').value;

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
				this._orgService.saveFinancialCommunity(this.financialCommunity),
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
			this.financialCommunity.isDesignPreviewEnabled = this.formFinancialCommunity.isDesignPreviewEnabled;

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
		const fc = this.selectedCommunity;

		if (!fc.inited)
		{
			this.loading = true;

			const commId = fc.id;

			// get promise of homesites for the financial community
			const lotDtosObs = this._homeSiteService.getCommunityHomeSites(commId);

			// get promise plans for the financial community
			const plansObs = this._planService.getCommunityPlans(commId);

			forkJoin(lotDtosObs, plansObs).pipe(
				switchMap(([lotDto, plansDto]) =>
				{
					const planKeys = plansDto.map(p => p.integrationKey);
					const getPlansWithTree = planKeys.length > 0 
						? this._treeService.getPlansWithTree(commId, planKeys)
						: of([]);

					return getPlansWithTree.pipe(
						map(planKeys => ([ lotDto, plansDto, planKeys ]))
					);
				}),
				map(([lotDto, plansDto, planKeys]) =>
				{
					fc.lots = lotDto.filter(l => l.lotStatusDescription !== 'Closed').map(l => new HomeSiteViewModel(l, fc.dto)).sort(HomeSiteViewModel.sorter);
					fc.plans = plansDto.map(p => new PlanViewModel(p, fc)).sort(PlanViewModel.sorter);

					// add lots to plans
					fc.plans.forEach(p =>
					{
						p.lots = fc.lots.filter(l => l.plans.some(lp => lp === p.id));
						p.hasPublishedTree = planKeys.includes(p.integrationKey);
					});
				}),
				finalize(() =>
				{
					this.loading = false;
				}))
				.subscribe(() =>
				{
					fc.inited = true;
				});
		}
	}

	disabledDesignPreviewSettings() : boolean
	{
		// A phd lite community has the phd lite feature switch enabled
		// and none of the plans in the community has published tree
		const isPhdLiteCommunity = this.isPhdLite && this.selectedCommunity.plans.every(p => !p.hasPublishedTree);
		
		return isPhdLiteCommunity || this.isSalesAdminReadOnly;
	}
}
