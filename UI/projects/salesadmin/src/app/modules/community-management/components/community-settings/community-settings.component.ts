import { Component, OnInit } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { FinancialCommunityViewModel, HomeSiteViewModel, PlanViewModel } from '../../../shared/models/plan-assignment.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { map, switchMap } from 'rxjs/operators';
import { FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';
import { combineLatest, forkJoin, of } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { SalesCommunity } from '../../../shared/models/salesCommunity.model';
import { ContractTemplate } from '../../../shared/models/contracts.model';
import { CommunityPdf, SectionHeader } from "../../../shared/models/communityPdf.model";
import { CommunityService } from "../../../core/services/community.service";
import { ContractService } from '../../../core/services/contract.service';
import { HomeSiteService } from '../../../core/services/homesite.service';
import { PlanService } from '../../../core/services/plan.service';

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
	allTemplates: Array<ContractTemplate> = [];
	allCommunityPdfs: Array<CommunityPdf> = [];
	homeWarrantyPdfs: Array<CommunityPdf> = [];
	communityAssociationPdfs: Array<CommunityPdf> = [];
	additionalDocumentPdfs: Array<CommunityPdf> = [];
	includedFeaturesPdfs: Array<CommunityPdf> = [];
	thoContract = null;
	orgId: number;
	canEdit = false;
	isSaving = false;
	url?: string = null;
	designPreviewUrl = 'www.example.com'; //TODO Make this the actual url in functionality story
	commmunityLinkEnabledDirty = false;
	previewEnabledDirty = false;
	canToggleCommunitySettings = false;
	environment = environment;
	ecoeRequired = false;
	earnestMoneyRequired = false;
	requiredThoTemplates = [];
	requiredPdfs = [];
	selectedOption = null;
	loading: boolean = false;

	get saveDisabled(): boolean
	{
		return !this.orgId
			// Disables save if form is invalid and user is not trying to turn on preview
			|| (!this.communitySettingsForm.valid && !this.previewEnabledDirty)
			// Disables save if user trys to remove existing value for ecoeMonths
			|| (this.communitySettingsForm.get('ecoeMonths').invalid && this.communitySettingsForm.get('ecoeMonths').dirty && this.financialCommunityInfo.defaultECOEMonths != null)
			// Disables save is user trys to remove existing value for earnest money
			|| (this.communitySettingsForm.get('earnestMoney').invalid && this.communitySettingsForm.get('earnestMoney').dirty && this.financialCommunityInfo.earnestMoneyAmount != null)
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
		private _homeSiteService: HomeSiteService,
		private _contractService: ContractService,
		private _communityService: CommunityService,
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
			switchMap(financialCommunity => {
				this.financialCommunity = financialCommunity;
				if(this.financialCommunity.id)
				{
					this.checkRequiredFilesExist();
				}
				if (financialCommunity.salesCommunityId) {
					return combineLatest(
						[this._orgService.getWebsiteCommunity(financialCommunity?.salesCommunityId),
						this._orgService.getSalesCommunity(financialCommunity?.salesCommunityId)]);
				}
				return of([null, null]);
			}),
		).subscribe(([websiteCommunity, salesCommunity]) => {
			this.url = (environment.thoUrl && websiteCommunity?.webSiteIntegrationKey)
				? environment.thoUrl + websiteCommunity.webSiteIntegrationKey
				: null;
			this.salesCommunity = salesCommunity;
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
					this.loadPlansAndHomeSites();

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
		this.checkRequiredFilesExist();
	}

	checkRequiredFilesExist()
	{
		if (this.financialCommunity && this.currentMarket) 
		{
			this._communityService.getCommunityPdfsByFinancialCommunityId(this.financialCommunity.id).subscribe(pdfs => 
			{
				this.allCommunityPdfs = pdfs;

				this.requiredPdfs = [
					{
						pdfs: pdfs.filter(x => x.sectionHeader === SectionHeader.HomeWarranty),
						message: '*Include: Home Warranty Documents'
					},
					{
						pdfs: pdfs.filter(x => x.sectionHeader === SectionHeader.AdditionalDocuments),
						message: '*Include: Included Features Documents'
					},
					{
						pdfs: pdfs.filter(x => x.sectionHeader === SectionHeader.CommunityAssociation),
						message: '*Include: Community Association Documents'
					},
					{
						pdfs: pdfs.filter(x => x.sectionHeader === SectionHeader.IncludedFeatures),
						message: '*Include: Additional Documents'
					}
				];
			});

			this._contractService.getDraftOrInUseContractTemplates(this.currentMarket.id).subscribe(templates => 
			{
				this.allTemplates = templates;

				let thoTemplates = this.allTemplates.filter(x => x.assignedCommunityIds.includes(this.financialCommunity.id)).filter(x => x.isTho == true).filter(x => x.status == 'InUse');

				this.requiredThoTemplates = [
					{
						thoTemplate: thoTemplates.filter(x => x.templateTypeId == 1),
						message: '*Sales Agreement Contract'
					},
					{
						thoTemplate: thoTemplates.filter(x => x.templateTypeId == 2),
						message: '*Include: Addenda Contract',
					},
					{
						thoTemplate: thoTemplates.filter(x => x.templateTypeId == 3),
						message: '*Include: Cancel Form Contract',
					},
					{
						thoTemplate: thoTemplates.filter(x => x.templateTypeId == 4),
						message: '*Include: JIO Contract',
					},
					{
						thoTemplate: thoTemplates.filter(x => x.templateTypeId == 5),
						message: '*Include: To Do Business Electronically Contract',
					}
				];
			});

			if (this.requiredPdfs.filter(x => x.pdfs.length > 0) && this.requiredThoTemplates.filter(x => x.thoTemplate.length > 0))
			{
				this.canToggleCommunitySettings = true;
			}
		}
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
		}, [])
	}

	save()
	{
		this.isSaving = true;
		if ((this.communitySettingsForm.dirty || this.commmunityLinkEnabledDirty || this.previewEnabledDirty) && this.communitySettingsForm.valid)
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
		else if (this.previewEnabledDirty)
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

				fc.lots = lotDto.filter(l => l.lotStatusDescription !== "Closed").map(l => new HomeSiteViewModel(l, fc.dto)).sort(HomeSiteViewModel.sorter);
				fc.plans = plansDto.map(p => new PlanViewModel(p, fc)).sort(PlanViewModel.sorter);

				// add lots to plans
				fc.plans.forEach(p =>
				{
					p.lots = fc.lots.filter(l => l.plans.some(lp => lp === p.id))
				});
			}));

			obs.subscribe(() =>
			{
				fc.inited = true;

				this.loading = false;
			});
		}
	}

	enableDesignPreviewBox()
	{
		return environment.selectedCommunityWhitelist.includes(this.currentMarket.id);
	}
}

